import { BacktestResult } from '../../types'
import { formatPercent, formatMoney } from '../../utils/format'

interface Props {
  result: BacktestResult
}

export default function MetricCards({ result }: Props) {
  const r = result
  const items = [
    { label: '累计收益率', value: formatPercent(r.totalReturn), cls: r.totalReturn >= 0 ? 'positive' : 'negative' },
    { label: '年化收益率', value: formatPercent(r.annualReturn), cls: r.annualReturn >= 0 ? 'positive' : 'negative' },
    { label: '最大回撤', value: formatPercent(r.maxDrawdown), cls: 'negative' },
    { label: '夏普比率', value: r.sharpeRatio.toFixed(2), cls: 'neutral' },
    { label: '年化波动率', value: formatPercent(r.volatility), cls: 'neutral' },
    { label: '累计投入', value: formatMoney(r.totalInvested), cls: 'neutral' },
    { label: '最终价值', value: formatMoney(r.finalValue), cls: r.finalValue >= r.totalInvested ? 'positive' : 'negative' },
    { label: '总收益', value: formatMoney(r.finalValue - r.totalInvested), cls: r.finalValue >= r.totalInvested ? 'positive' : 'negative' },
    ...(r.totalCycles > 0 ? [
      { label: '止盈次数', value: `${r.totalCycles} 次`, cls: 'positive' },
      { label: '已变现收益', value: formatMoney(r.totalCashFromSells), cls: 'positive' },
    ] : []),
  ]

  return (
    <div className="metrics-grid">
      {items.map(item => (
        <div className="metric-card" key={item.label}>
          <div className="label">{item.label}</div>
          <div className={`value ${item.cls}`}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}
