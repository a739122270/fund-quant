import { PortfolioConfig, PortfolioResult, DailyValue, FundResult } from '../types'
import { runBacktest } from './strategies'
import { loadNavData, refreshAllFundData } from '../utils/csv'

/** 运行组合回测 */
export async function runPortfolioBacktest(config: PortfolioConfig): Promise<PortfolioResult> {
  if (config.funds.length === 0) throw new Error('请至少添加一只基金')
  if (config.initialCapital < 0) throw new Error('初始金额不能为负数')
  if (config.monthlyAvailable < 0) throw new Error('每月可用金额不能为负数')

  // 先刷新所有基金数据
  const codes = config.funds.map(f => f.code)
  await refreshAllFundData(codes)

  // 逐只基金运行回测
  const fundResults: FundResult[] = []
  for (const fund of config.funds) {
    const navData = await loadNavData(fund.code)
    const result = runBacktest(navData, fund.config)
    fundResults.push({ code: fund.code, name: fund.name, result })
  }

  // 按日期聚合 dailyValues（前向填充，确保每只基金在每一天都有数据）
  // 先收集每只基金的数据到各自的 Map，同时收集所有日期
  const fundMaps: { data: Map<string, { invested: number; value: number; cash: number }> }[] = []
  const allDates = new Set<string>()

  for (const fr of fundResults) {
    const data = new Map<string, { invested: number; value: number; cash: number }>()
    for (const dv of fr.result.dailyValues) {
      data.set(dv.date, { invested: dv.invested, value: dv.value, cash: dv.cash })
      allDates.add(dv.date)
    }
    fundMaps.push({ data })
  }

  // 按日期排序，前向填充：每只基金找不到当天数据时沿用最近的已知值
  const sortedDates = Array.from(allDates).sort()
  const cursors = fundMaps.map(() => ({ invested: 0, value: 0, cash: 0 }))

  const dailyValues: DailyValue[] = sortedDates.map(date => {
    const sum = { invested: 0, value: 0, cash: 0 }
    for (let i = 0; i < fundMaps.length; i++) {
      const v = fundMaps[i].data.get(date)
      if (v) cursors[i] = v
      sum.invested += cursors[i].invested
      sum.value += cursors[i].value
      sum.cash += cursors[i].cash
    }
    return { date, nav: 0, ...sum }
  })

  if (dailyValues.length < 2) throw new Error('组合回测数据不足')

  // 汇总指标（只计算实际投入的资金，初始资本只作为预算上限）
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

  // 年化波动率和夏普比率
  const dailyRet: number[] = []
  for (let i = 1; i < dailyValues.length; i++) {
    const p = dailyValues[i - 1].value + dailyValues[i - 1].cash
    const c = dailyValues[i].value + dailyValues[i].cash
    if (p > 0) dailyRet.push((c - p) / p)
  }

  let volatility = 0, sharpeRatio = 0
  if (dailyRet.length > 0) {
    const avg = dailyRet.reduce((a, b) => a + b, 0) / dailyRet.length
    const variance = dailyRet.reduce((s, r) => s + (r - avg) ** 2, 0) / dailyRet.length
    volatility = Math.sqrt(variance) * Math.sqrt(252) * 100
    sharpeRatio = volatility > 0 ? ((annualReturn - 2.5) / 100) / (volatility / 100) : 0
  }

  return {
    config,
    fundResults,
    dailyValues,
    totalInvested,
    finalValue,
    totalReturn,
    annualReturn,
    maxDrawdown,
    sharpeRatio,
    volatility,
  }
}
