import { useState, useEffect } from 'react'
import { PortfolioConfig, PortfolioFundConfig, PortfolioResult, BacktestConfig } from '../types'
import { getETFList } from '../data/etf-list'
import { runPortfolioBacktest } from '../engine/portfolio'
import FundContribution from './Portfolio/FundContribution'
import FundSearchResults from './Portfolio/FundSearchResults'
import AIChat from './Portfolio/AIChat'
import ConfigPanel from '../components/ConfigPanel/ConfigPanel'
import TransactionTable from '../components/TransactionTable/TransactionTable'

// 缓存回测结果，切换 Tab 回来不丢失
let _cachedResult: PortfolioResult | null = null

const STORAGE_KEY = 'portfolio_config'

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function savePortfolio(state: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export default function PortfolioBacktest() {
  const saved = loadPortfolio()
  const [initialCapital, setInitialCapital] = useState(saved.initialCapital ?? 100000)
  const [monthlyAvailable, setMonthlyAvailable] = useState(saved.monthlyAvailable ?? 10000)
  const [funds, setFunds] = useState<PortfolioFundConfig[]>(saved.funds ?? [])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(saved.selectedIdx ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PortfolioResult | null>(_cachedResult)
  const [showAdd, setShowAdd] = useState(false)
  const [addCode, setAddCode] = useState('')
  const [fetchingCode, setFetchingCode] = useState('')
  const [successCode, setSuccessCode] = useState('')

  // 缓存回测结果到模块变量（切换 Tab 不丢失）
  useEffect(() => { _cachedResult = result }, [result])

  // 自动保存到 localStorage
  useEffect(() => {
    savePortfolio({ initialCapital, monthlyAvailable, funds, selectedIdx })
  }, [initialCapital, monthlyAvailable, funds, selectedIdx])

  useEffect(() => { if (successCode) { const t = setTimeout(() => setSuccessCode(''), 2000); return () => clearTimeout(t) } }, [successCode])

  const totalAllocated = funds.reduce((s, f) => s + f.monthlyAmount, 0)
  const selected = selectedIdx !== null ? funds[selectedIdx] : null

  const handleAddFund = async (code?: string, fundName?: string) => {
    code = (code || addCode).trim()
    if (!/^\d{6}$/.test(code)) return
    if (funds.some(f => f.code === code)) return

    setFetchingCode(code)
    try {
      const resp = await fetch(`/api/fetch/${code}`, { method: 'POST' })
      if (!resp.ok) { setError('拉取基金数据失败'); setFetchingCode(''); return }
    } catch { setError('网络错误'); setFetchingCode(''); return }

    const preset = getETFList().find(e => e.code === code)
    const name = fundName || (preset ? preset.name : `ETF-${code}`)
    const cfg: BacktestConfig = {
      etfCode: code, strategy: 'dca', startDate: '2023-06-01', endDate: new Date().toISOString().slice(0, 10),
      amount: 1000, frequency: 'monthly', dayOfWeek: 1, dayOfMonth: 10, feeRate: 0.0015,
    }
    setFunds([...funds, { code, name, monthlyAmount: cfg.amount, config: cfg }])
    setSelectedIdx(funds.length)
    setShowAdd(false); setAddCode(''); setSuccessCode(code); setFetchingCode('')
  }

  const updateFund = (idx: number, patch: Partial<PortfolioFundConfig>) => {
    const next = [...funds]
    next[idx] = { ...next[idx], ...patch }
    setFunds(next)
  }

  const updateConfig = (idx: number, cfg: BacktestConfig) => updateFund(idx, { config: cfg, monthlyAmount: cfg.amount })

  const handleRun = async () => {
    if (funds.length === 0) { setError('请至少添加一只基金'); return }
    if (totalAllocated > monthlyAvailable) { setError('基础每期金额总和超过每月可用金额'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const cfgs: PortfolioConfig = { initialCapital, monthlyAvailable, funds }
      const r = await runPortfolioBacktest(cfgs)
      setResult(r)
    } catch (e: any) { setError(e.message || '回测失败') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ width: "100%" }}>
      {/* 顶部：可用资金 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 12, color: '#666' }}>初始金额</label>
            <input type="number" value={initialCapital} onChange={e => setInitialCapital(Number(e.target.value))} style={inputStyle} min={0} step={10000} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666' }}>每月可用金额</label>
            <input type="number" value={monthlyAvailable} onChange={e => setMonthlyAvailable(Number(e.target.value))} style={inputStyle} min={0} step={1000} />
          </div>
          <div style={{ fontSize: 12, color: totalAllocated > monthlyAvailable ? '#e53e3e' : '#38a169' }}>
            已分配 ¥{totalAllocated.toLocaleString()}/月
            {totalAllocated <= monthlyAvailable && ` (剩余 ¥${(monthlyAvailable - totalAllocated).toLocaleString()})`}
          </div>
        </div>
      </div>

      {/* 主体：左列表+配置 / 右结果 */}
      <div style={{ display: 'flex', gap: 16, width: '100%' }}>
        {/* 左侧 */}
        <div className="sidebar">
          <div className="card">
            <div className="card-title">基金列表</div>
            {!showAdd ? (
              <button onClick={() => setShowAdd(true)} style={addBtnStyle}>＋ 添加基金</button>
            ) : (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <input autoFocus value={addCode} onChange={e => setAddCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFund()}
                  placeholder="基金代码" style={{ ...inputStyle, width: 100, fontSize: 12 }} />
                <button onClick={() => handleAddFund()} style={{ padding: '4px 8px', border: 'none', borderRadius: 4, background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 12 }}>确认</button>
                <button onClick={() => setShowAdd(false)} style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12 }}>取消</button>
              </div>
            )}
            <FundSearchResults query={addCode} onSelect={(code, name) => handleAddFund(code, name)} exclude={funds.map(f => f.code)} />
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {funds.length === 0 ? <div style={{ fontSize: 12, color: '#999', padding: 12, textAlign: 'center' }}>暂无基金</div>
                : funds.map((f, i) => (
                <div key={f.code} onClick={() => setSelectedIdx(i)} style={{
                  padding: '7px 10px', cursor: 'pointer', borderRadius: 4, fontSize: 13,
                  background: selectedIdx === i ? '#eff6ff' : 'transparent',
                  color: selectedIdx === i ? '#2563eb' : '#333',
                  fontWeight: selectedIdx === i ? 600 : 400,
                  borderLeft: selectedIdx === i ? '3px solid #2563eb' : '3px solid transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{f.name}</span>
                  <span>
                    <span style={{ color: '#999', fontSize: 11 }}></span>
                    <span onClick={(e) => { e.stopPropagation(); const n = funds.filter((_, j) => j !== i); setFunds(n); if (selectedIdx === i) setSelectedIdx(n.length > 0 ? Math.min(i, n.length - 1) : null) }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 12, lineHeight: 1, marginLeft: 6 }}>–</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <ConfigPanel key={selected.code} cardTitle={selected.name + ' (' + selected.code + ')'}
              etfCode={selected.code} initialConfig={selected.config}
              onRun={(cfg) => { updateConfig(selectedIdx!, cfg); setTimeout(() => handleRun(), 0) }} loading={loading} />
          )}
        </div>

        {/* 右侧：结果 + AI */}
        <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading && <div className="card" style={{ textAlign: 'center', padding: 40 }}>回测计算中...</div>}
            {error && <div className="card" style={{ borderLeft: '4px solid #e53e3e' }}><pre style={{ color: '#e53e3e', margin: 0, fontSize: 13 }}>{error}</pre></div>}
            {result && (
              <>
                <div className="metrics-grid">
                  <div className="metric-card"><div className="label">累计收益率</div><div className={`value ${result.totalReturn >= 0 ? 'positive' : 'negative'}`}>{result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%</div></div>
                  <div className="metric-card"><div className="label">年化收益率</div><div className={`value ${result.annualReturn >= 0 ? 'positive' : 'negative'}`}>{result.annualReturn >= 0 ? '+' : ''}{result.annualReturn.toFixed(2)}%</div></div>
                  <div className="metric-card"><div className="label">年化波动率</div><div className="value neutral">{result.volatility.toFixed(2)}%</div></div>
                  <div className="metric-card"><div className="label">夏普比率</div><div className="value neutral">{result.sharpeRatio.toFixed(2)}</div></div>
                  <div className="metric-card"><div className="label">最大回撤</div><div className="value negative">{result.maxDrawdown.toFixed(2)}%</div></div>
                  <div className="metric-card"><div className="label">累计投入</div><div className="value neutral">{'¥' + Math.round(result.totalInvested).toLocaleString()}</div></div>
                  <div className="metric-card"><div className="label">组合总资产</div><div className="value neutral">{'¥' + Math.round(result.finalValue).toLocaleString()}</div></div>
                  <div className="metric-card"><div className="label">总收益</div><div className={`value ${(result.finalValue - result.totalInvested) >= 0 ? 'positive' : 'negative'}`}>{'¥' + Math.round(result.finalValue - result.totalInvested).toLocaleString()}</div></div>
                </div>
                <div className="card"><FundContribution fundResults={result.fundResults} /></div>
                <TransactionTable trades={result.fundResults.flatMap(f =>
                  f.result.trades.map(t => ({ ...t, fundName: f.name }))
                ).sort((a, b) => a.date.localeCompare(b.date))} />
              </>
            )}
            {!result && !loading && !error && (
              <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                <p style={{ color: '#999', fontSize: 14 }}>配置组合并开始回测后查看结果</p>
              </div>
            )}
          </div>
          <div style={{ width: 360, flexShrink: 0 }}>
            <AIChat portfolioContext={JSON.stringify({ initialCapital, monthlyAvailable, funds })} />
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
const addBtnStyle: React.CSSProperties = { width: '100%', padding: '6px 0', border: '1px dashed #d9d9d9', borderRadius: 6, background: '#fafafa', color: '#666', fontSize: 12, cursor: 'pointer', marginBottom: 8 }
