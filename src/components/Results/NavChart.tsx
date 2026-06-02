import { useMemo } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { DailyValue } from '../../types'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

interface Props {
  dailyValues: DailyValue[]
  totalInvested: number
}

export default function NavChart({ dailyValues }: Props) {
  const option = useMemo(() => {
    const dates = dailyValues.map(d => d.date)
    // 总资产 = 持仓市值 + 现金余额
    const totalAssets = dailyValues.map(d => Math.round((d.value + d.cash) * 100) / 100)
    const invested = dailyValues.map(d => Math.round(d.invested * 100) / 100)

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          const date = params[0].axisValue
          let html = `<strong>${date}</strong><br/>`
          params.forEach((p: any) => {
            html += `${p.marker} ${p.seriesName}: ¥${Number(p.value).toLocaleString()}<br/>`
          })
          return html
        },
      },
      legend: {
        data: ['总资产', '累计投入'],
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 60, right: 20, bottom: 40, top: 10 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { fontSize: 11, color: '#999' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11,
          color: '#999',
          formatter: (v: number) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toString(),
        },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
      },
      series: [
        {
          name: '总资产',
          type: 'line',
          data: totalAssets,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, color: '#2563eb' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(37,99,235,0.15)' },
              { offset: 1, color: 'rgba(37,99,235,0.01)' },
            ]),
          },
        },
        {
          name: '累计投入',
          type: 'line',
          data: invested,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, type: 'dashed', color: '#94a3b8' },
        },
      ],
    }
  }, [dailyValues])

  return (
    <div className="chart-container">
      <h3>资产净值曲线</h3>
      <ReactEChartsCore echarts={echarts} option={option} style={{ height: 320 }} />
    </div>
  )
}
