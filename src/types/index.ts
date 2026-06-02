export interface ETFInfo {
  code: string
  name: string
  index: string
}

export interface NavRecord {
  date: string
  nav: number
}

export type StrategyType = 'dca' | 'lump_sum'

export interface DipBuyTier {
  thresholdPercent: number
  investPercent: number
}

export interface DipBuyConfig {
  enabled: boolean
  tiers: DipBuyTier[]
}

export interface TakeProfitTier {
  thresholdPercent: number
  sellRatio: number
}

export interface TakeProfitConfig {
  enabled: boolean
  tiers: TakeProfitTier[]
}

export interface SmartDCAConfig {
  enabled: boolean
  lookbackDays: number
  lowPercentile: number
  highPercentile: number
  lowMultiplier: number
  midMultiplier: number
  highMultiplier: number
}

export interface StopLossTier {
  thresholdPercent: number  // 亏损达到此值触发，如 10 表示亏损 10%
  sellRatio: number         // 卖出比例
}

export interface StopLossConfig {
  enabled: boolean
  tiers: StopLossTier[]
}

export interface BacktestConfig {
  etfCode: string
  strategy: StrategyType
  startDate: string
  endDate: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  dayOfWeek: number
  dayOfMonth: number
  feeRate: number
  dipBuy?: DipBuyConfig
  takeProfit?: TakeProfitConfig
  smartDCA?: SmartDCAConfig
  stopLoss?: StopLossConfig
}

export interface TradeRecord {
  date: string
  nav: number
  action: 'buy' | 'sell'
  investAmount: number
  fee: number
  shares: number
  totalShares: number
  totalInvested: number
  marketValue: number
  return: number
}

export interface DailyValue {
  date: string
  invested: number
  value: number
  nav: number
  cash: number
}

export interface BacktestResult {
  config: BacktestConfig
  trades: TradeRecord[]
  dailyValues: DailyValue[]
  totalInvested: number
  finalValue: number
  totalReturn: number
  annualReturn: number
  maxDrawdown: number
  sharpeRatio: number
  volatility: number
  totalTrades: number
  totalCashFromSells: number
  totalCycles: number
}

/** 组合中单只基金的配置 */
export interface PortfolioFundConfig {
  code: string
  name: string
  monthlyAmount: number
  config: BacktestConfig
}

/** 组合回测参数 */
export interface PortfolioConfig {
  initialCapital: number
  monthlyAvailable: number
  funds: PortfolioFundConfig[]
}

/** 单只基金的回测结果 */
export interface FundResult {
  code: string
  name: string
  result: BacktestResult
}

/** 组合回测结果 */
export interface PortfolioResult {
  config: PortfolioConfig
  fundResults: FundResult[]
  dailyValues: DailyValue[]
  totalInvested: number
  finalValue: number
  totalReturn: number
  annualReturn: number
  maxDrawdown: number
}
