import { useState } from 'react'
import FundSelector from './components/FundSelector/FundSelector'
import ConfigPanel from './components/ConfigPanel/ConfigPanel'
import MetricCards from './components/Results/MetricCards'
import NavChart from './components/Results/NavChart'
import ReturnChart from './components/Results/ReturnChart'
import TransactionTable from './components/TransactionTable/TransactionTable'
import { useBacktest } from './hooks/useBacktest'
import { BacktestConfig } from './types'

export default function App() {
  const [selectedCode, setSelectedCode] = useState('510300')
  const { loading, error, result, run } = useBacktest()

  const handleRun = (config: BacktestConfig) => {
    run(config)
  }

  return (
    <div className="app">
      {/* 头部 */}
      <header className="app-header">
        <h1>ETF 基金回测工具</h1>
        <p>选择基金 → 配置策略 → 查看历史收益表现</p>
      </header>

      {/* 主体 */}
      <div className="app-content">
        {/* 左侧配置 */}
        <div className="sidebar">
          <FundSelector value={selectedCode} onChange={setSelectedCode} />
          <ConfigPanel
            etfCode={selectedCode}
            onRun={handleRun}
            loading={loading}
          />
        </div>

        {/* 右侧结果 */}
        <div className="main-area">
          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#666' }}>回测计算中，请稍候...</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ borderLeft: '4px solid #e53e3e' }}>
              <pre style={{
                color: '#e53e3e',
                margin: 0,
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                lineHeight: 1.6,
              }}>{error}</pre>
            </div>
          )}

          {result && !loading && (
            <>
              <MetricCards result={result} />
              <NavChart dailyValues={result.dailyValues} totalInvested={result.totalInvested} />
              <ReturnChart trades={result.trades} />
              <TransactionTable trades={result.trades} />
            </>
          )}

          {!result && !loading && !error && (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <p style={{ color: '#999', fontSize: 14 }}>
                请选择基金和策略，点击"开始回测"查看结果
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 免责声明 */}
      <div className="disclaimer">
        <strong>风险提示：</strong>
        基金有风险，投资需谨慎。本工具提供的所有回测结果仅为历史数据模拟，不构成任何投资建议。
        历史表现不代表未来收益。投资者应独立判断并承担投资风险。
        数据来源：天天基金网 (AkShare)。
      </div>
    </div>
  )
}
