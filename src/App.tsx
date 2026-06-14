import { useState } from 'react'
import FundSelector from './components/FundSelector/FundSelector'
import ConfigPanel from './components/ConfigPanel/ConfigPanel'
import MetricCards from './components/Results/MetricCards'
import NavChart from './components/Results/NavChart'
import ReturnChart from './components/Results/ReturnChart'
import TransactionTable from './components/TransactionTable/TransactionTable'
import PortfolioBacktest from './pages/PortfolioBacktest'
import { useBacktest } from './hooks/useBacktest'
import { BacktestConfig } from './types'

export default function App() {
  const [tab, setTab] = useState<'single' | 'portfolio'>('single')
  const [selectedCode, setSelectedCode] = useState('510300')
  const { loading, refreshing, error, result, run } = useBacktest()

  const handleRun = (config: BacktestConfig) => run(config)

  return (
    <div className="app">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>ETF 基金回测工具</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>选择基金 → 配置策略 → 查看历史收益表现</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: 3 }}>
          <button onClick={() => setTab('single')} style={tabBtn(tab === 'single')}>单基金回测</button>
          <button onClick={() => setTab('portfolio')} style={tabBtn(tab === 'portfolio')}>组合回测</button>
        </div>
      </header>

      <div style={{ display: tab === 'single' ? 'block' : 'none' }}>
        <div className="app-content">
          <div className="sidebar">
            <FundSelector value={selectedCode} onChange={setSelectedCode} />
            <ConfigPanel etfCode={selectedCode} onRun={handleRun} loading={loading} />
          </div>
          <div className="main-area">
            {loading && <div className="card" style={{ textAlign: 'center', padding: 40 }}><p style={{ color: '#666' }}>{refreshing ? '正在拉取最新数据...请稍等' : '回测计算中，请稍候...'}</p></div>}
            {error && <div className="card" style={{ borderLeft: '4px solid #e53e3e' }}><pre style={{ color: '#e53e3e', margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{error}</pre></div>}
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
                <p style={{ color: '#999', fontSize: 14 }}>请选择基金和策略，点击"开始回测"查看结果</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: tab === 'portfolio' ? 'block' : 'none' }}>
        <div className="app-content" style={{ flexDirection: 'column' }}>
          <PortfolioBacktest />
        </div>
      </div>

      <div className="disclaimer">
        <strong>风险提示：</strong>
        基金有风险，投资需谨慎。本工具提供的所有回测结果仅为历史数据模拟，不构成任何投资建议。
        历史表现不代表未来收益。投资者应独立判断并承担投资风险。
        数据来源：天天基金网 (AkShare)。
      </div>
    </div>
  )
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 14px', border: 'none', borderRadius: 4,
    background: active ? 'rgba(255,255,255,0.9)' : 'transparent',
    color: active ? '#1a365d' : 'rgba(255,255,255,0.7)',
    fontWeight: active ? 600 : 400, fontSize: 13, cursor: 'pointer',
  }
}
