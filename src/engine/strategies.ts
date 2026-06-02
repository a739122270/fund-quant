import { NavRecord, BacktestConfig, DailyValue, TradeRecord, BacktestResult } from '../types'

function calcNAVPercentile(fullData: NavRecord[], currentDate: string, currentNav: number, lookbackDays: number): number {
  const idx = fullData.findIndex(r => r.date === currentDate)
  if (idx < 0) return 50
  const start = Math.max(0, idx - lookbackDays)
  const window = fullData.slice(start, idx + 1)
  if (window.length < 2) return 50
  let min = Infinity, max = -Infinity
  for (const r of window) { if (r.nav < min) min = r.nav; if (r.nav > max) max = r.nav }
  if (max === min) return 50
  return ((currentNav - min) / (max - min)) * 100
}

function makeBuy(date: string, nav: number, amt: number, fr: number, ts: number, ti: number, cb: number): TradeRecord {
  const fee = amt * fr, ai = amt - fee, sb = ai / nav, nts = ts + sb, nti = ti + amt
  return { date, nav, action: 'buy', investAmount: amt, fee, shares: sb, totalShares: nts, totalInvested: nti, marketValue: nts * nav, return: ((nts * nav + cb - nti) / nti) * 100 }
}

function makeSell(date: string, nav: number, sts: number, fr: number, ts: number, ti: number, cb: number): TradeRecord {
  const sa = sts * nav, sf = sa * fr, p = sa - sf, rs = ts - sts, ta = rs * nav + cb + p
  return { date, nav, action: 'sell', investAmount: p, fee: sf, shares: Math.round(sts * 100) / 100, totalShares: Math.round(rs * 100) / 100, totalInvested: ti, marketValue: rs * nav, return: ((ta - ti) / ti) * 100 }
}

export function runBacktest(navData: NavRecord[], config: BacktestConfig): BacktestResult {
  const { startDate, endDate } = config
  const filtered = navData.filter(r => r.date >= startDate && r.date <= endDate)
  if (filtered.length < 2) throw new Error('回测区间数据不足（至少需要 2 个交易日）')

  const dbCfg = config.dipBuy?.enabled ? config.dipBuy : null
  const tpCfg = config.takeProfit?.enabled ? config.takeProfit : null
  const slCfg = config.stopLoss?.enabled ? config.stopLoss : null
  const sdCfg = config.smartDCA?.enabled ? config.smartDCA : null

  let ts = 0, ti = 0, cb = 0
  const trades: TradeRecord[] = [], dv: DailyValue[] = []
  let cycB = 0
  const tpTr: Set<number> = new Set(), slTr: Set<number> = new Set(), dbTr: Set<number> = new Set()
  let peakR = 0, lastM = -1

  function monthlyDCA(date: string, dom: number): boolean {
    const d = new Date(date)
    if (isNaN(d.getTime())) return false
    const m = d.getFullYear() * 12 + d.getMonth()
    if (m === lastM) return false
    if (d.getDate() < dom) return false
    lastM = m; return true
  }

  for (const r of filtered) {
    const { date, nav } = r

    // 计算周期收益率（补仓/止盈/止损共用）
    let cycR: number | null = null
    if ((dbCfg || tpCfg || slCfg) && ts > 0) {
      const ci = ti - cycB
      if (ci > 0) cycR = (ts * nav - ci) / ci * 100
    }

    // 补仓：持仓亏损达到阈值时追加
    if (dbCfg && cycR !== null && cycR < 0) {
      for (const t of dbCfg.tiers) {
        if (cycR <= -t.thresholdPercent && !dbTr.has(t.thresholdPercent)) {
          dbTr.add(t.thresholdPercent)
          const amt = (ts * nav) * t.investPercent / 100
          const tr = makeBuy(date, nav, amt, config.feeRate, ts, ti, cb)
          ts = tr.totalShares; ti = tr.totalInvested; trades.push(tr)
        }
      }
    }

    // 定投
    let isDCA = false
    if (config.strategy === 'dca') {
      const d = new Date(date)
      if (!isNaN(d.getTime())) {
        if (config.frequency === 'weekly') isDCA = d.getDay() === config.dayOfWeek
        else if (config.frequency === 'biweekly') isDCA = d.getDay() === config.dayOfWeek && Math.floor((d.getDate() - 1) / 7) % 2 === 0
        else if (config.frequency === 'monthly') isDCA = monthlyDCA(date, config.dayOfMonth)
      }
    }
    if (isDCA || (config.strategy === 'lump_sum' && date === filtered[0].date)) {
      let amt = config.amount
      if (sdCfg && config.strategy === 'dca') {
        const pct = calcNAVPercentile(navData, date, nav, sdCfg.lookbackDays)
        if (pct < sdCfg.lowPercentile) amt = config.amount * sdCfg.lowMultiplier / 100
        else if (pct > sdCfg.highPercentile) amt = config.amount * sdCfg.highMultiplier / 100
        else amt = config.amount * sdCfg.midMultiplier / 100
      }
      const tr = makeBuy(date, nav, amt, config.feeRate, ts, ti, cb)
      ts = tr.totalShares; ti = tr.totalInvested; trades.push(tr)
    }

    // 更新 peakR（移动止盈需要）
    if (cycR !== null && cycR > peakR) peakR = cycR

    // 止盈
    if (tpCfg && cycR !== null) {
      const td = peakR - cycR
      for (const t of tpCfg.tiers) {
        if (td >= t.thresholdPercent && !tpTr.has(t.thresholdPercent)) {
          tpTr.add(t.thresholdPercent)
          const sr = t.sellRatio / 100, sts = ts * sr
          cycB += (ti - cycB) * sr
          const tr = makeSell(date, nav, sts, config.feeRate, ts, ti, cb)
          ts -= sts; cb += tr.investAmount; trades.push(tr); break
        }
      }
    }

    // 止损
    if (slCfg && cycR !== null) {
      for (const t of slCfg.tiers) {
        if (cycR <= -t.thresholdPercent && !slTr.has(t.thresholdPercent)) {
          slTr.add(t.thresholdPercent)
          const sr = t.sellRatio / 100, sts = ts * sr
          cycB += (ti - cycB) * sr
          const tr = makeSell(date, nav, sts, config.feeRate, ts, ti, cb)
          ts -= sts; cb += tr.investAmount; trades.push(tr); break
        }
      }
    }

    dv.push({ date, invested: ti, value: ts * nav, nav, cash: cb })
  }

  if (trades.length === 0) throw new Error(config.strategy === 'dca' ? '定投区间内没有匹配的定投日' : '没有生成交易记录')

  const fNav = filtered[filtered.length - 1].nav
  const fTA = ts * fNav + cb
  const tR = ti > 0 ? ((fTA - ti) / ti) * 100 : 0
  const fd = new Date(filtered[0].date), ld = new Date(filtered[filtered.length - 1].date)
  const yrs = (ld.getTime() - fd.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  const aR = ti > 0 && yrs > 0 ? (Math.pow(fTA / ti, 1 / yrs) - 1) * 100 : 0

  let mdd = 0, pk = Number.NEGATIVE_INFINITY
  for (const d of dv) {
    const a = d.value + d.cash; if (a <= 0) continue
    if (a > pk) pk = a
    const dd = pk > 0 ? (1 - a / pk) * 100 : 0
    if (dd > mdd) mdd = dd
  }

  const dRet: number[] = []
  for (let i = 1; i < dv.length; i++) {
    const p = dv[i - 1].value + dv[i - 1].cash, c = dv[i].value + dv[i].cash
    if (p > 0) dRet.push((c - p) / p)
  }

  let vol = 0, sr2 = 0
  if (dRet.length > 0) {
    const avg = dRet.reduce((a, b) => a + b, 0) / dRet.length
    const v_ = dRet.reduce((s, r) => s + (r - avg) ** 2, 0) / dRet.length
    vol = Math.sqrt(v_) * Math.sqrt(252) * 100
    sr2 = vol > 0 ? ((aR - 2.5) / 100) / (vol / 100) : 0
  }

  return {
    config, trades, dailyValues: dv, totalInvested: ti, finalValue: fTA,
    totalReturn: tR, annualReturn: aR, maxDrawdown: mdd, sharpeRatio: sr2, volatility: vol,
    totalTrades: trades.length, totalCashFromSells: cb, totalCycles: 0,
  }
}
