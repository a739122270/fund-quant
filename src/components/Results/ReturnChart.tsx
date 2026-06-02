import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { TradeRecord } from '../../types'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

interface Props {
  trades: TradeRecord[]
}

export default function ReturnChart({ trades }: Props) {
  const data = useMemo(() => {
    return trades.map(t => ({
      date: t.date,
      return: t.return,
    }))
  }, [trades])

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0]
        return `<strong>${p.axisValue}</strong><br/>累计收益率: ${Number(p.value).toFixed(2)}%`
      },
    },
    grid: { left: 60, right: 20, bottom: 30, top: 10 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: {
        fontSize: 10,
        color: '#999',
        // 只显示部分标签
        interval: Math.max(1, Math.floor(data.length / 10)),
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#999', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({
        value: Math.round(d.return * 100) / 100,
        itemStyle: {
          color: d.return >= 0 ? 'rgba(37,99,235,0.6)' : 'rgba(239,68,68,0.6)',
        },
      })),
      barWidth: '60%',
    }],
  }), [data])

  return (
    <div className="chart-container">
      <h3>各期定投收益率</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 200 }} />
    </div>
  )
}
