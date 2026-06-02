import { PortfolioConfig, PortfolioResult, DailyValue, FundResult } from '../types'
import { runBacktest } from './strategies'
import { loadNavData } from '../utils/csv'

/** 运行组合回测 */
export async function runPortfolioBacktest(config: PortfolioConfig): Promise<PortfolioResult> {
  if (config.funds.length === 0) throw new Error('请至少添加一只基金')
  if (config.initialCapital < 0) throw new Error('初始金额不能为负数')
  if (config.monthlyAvailable < 0) throw new Error('每月可用金额不能为负数')

  // 逐只基金运行回测
  const fundResults: FundResult[] = []
  for (const fund of config.funds) {
    const navData = await loadNavData(fund.code)
    const result = runBacktest(navData, fund.config)
    fundResults.push({ code: fund.code, name: fund.name, result })
  }

  // 按日期聚合 dailyValues
  const dateMap = new Map<string, { invested: number; value: number; cash: number }>()

  for (const fr of fundResults) {
    for (const dv of fr.result.dailyValues) {
      const existing = dateMap.get(dv.date)
      if (existing) {
        existing.invested += dv.invested
        existing.value += dv.value
        existing.cash += dv.cash
      } else {
        dateMap.set(dv.date, { invested: dv.invested, value: dv.value, cash: dv.cash })
      }
    }
  }

  // 转为排序后的数组
  const dailyValues: DailyValue[] = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      invested: d.invested,
      value: d.value,
      nav: 0, // 组合级别无 NAV
      cash: d.cash,
    }))

  if (dailyValues.length < 2) throw new Error('组合回测数据不足')

  // 汇总指标
  const last = dailyValues[dailyValues.length - 1]
  const totalInvested = last.invested
  const finalValue = last.value + last.cash
  const totalReturn = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0

  const firstDate = new Date(dailyValues[0].date)
  const lastDate = new Date(dailyValues[dailyValues.length - 1].date)
  const years = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  const annualReturn = totalInvested > 0 && years > 0
    ? (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100
    : 0

  let maxDrawdown = 0
  let peak = Number.NEGATIVE_INFINITY
  for (const dv of dailyValues) {
    const a = dv.value + dv.cash
    if (a <= 0) continue
    if (a > peak) peak = a
    const dd = peak > 0 ? (1 - a / peak) * 100 : 0
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  // 初始金额：在首日注入
  if (config.initialCapital > 0 && dailyValues.length > 0) {
    dailyValues[0].invested += config.initialCapital
    dailyValues[0].value += config.initialCapital
  }

  return {
    config,
    fundResults,
    dailyValues,
    totalInvested: totalInvested + config.initialCapital,
    finalValue,
    totalReturn,
    annualReturn,
    maxDrawdown,
  }
}
