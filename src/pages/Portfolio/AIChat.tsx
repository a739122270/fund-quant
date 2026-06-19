import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  portfolioContext: string
}

interface RiskItem {
  level: 'high' | 'medium' | 'low'
  description: string
}

interface FundAnalysisItem {
  fund_name: string
  evaluation: string
  suggestion: string
}

interface AnalysisData {
  summary: string
  score: number
  strengths: string[]
  risks: RiskItem[]
  suggestions: string[]
  asset_allocation: string
  fund_analysis: FundAnalysisItem[]
}

// ─── 每日免费调用计数（后台记录，不展示） ──────────────────────
// ★ 改次数改这里就行
const FREE_LIMIT = 10
const FREE_COUNT_KEY = 'ai_free_count'
const FREE_DATE_KEY = 'ai_free_date'

function getFreeUsed(): number {
  const date = localStorage.getItem(FREE_DATE_KEY)
  const today = new Date().toISOString().slice(0, 10)
  if (date !== today) {
    localStorage.setItem(FREE_DATE_KEY, today)
    localStorage.setItem(FREE_COUNT_KEY, '0')
    return 0
  }
  return Number(localStorage.getItem(FREE_COUNT_KEY)) || 0
}

function markFreeUsed(): number {
  const used = getFreeUsed() + 1
  localStorage.setItem(FREE_COUNT_KEY, String(used))
  return used
}

// ─────────────────────────────────────────────────────────────

function tryParseJSON(text: any): AnalysisData | null {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

function AnalysisCard({ data }: { data: AnalysisData }) {
  const score = Number(data.score) || 0
  const scoreColor = score >= 80 ? '#38a169' : score >= 60 ? '#d69e2e' : '#e53e3e'
  const strengths = Array.isArray(data.strengths) ? data.strengths : []
  const risks = Array.isArray(data.risks) ? data.risks : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
  const fundAnalysis = Array.isArray(data.fund_analysis) ? data.fund_analysis : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 综合评分 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{score}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#999' }}>综合评分</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{data.summary ?? ''}</div>
        </div>
      </div>

      {/* 优势 */}
      {strengths.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#2f855a', marginBottom: 6 }}>
            <span>📈</span> 优势
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {strengths.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: '#555', display: 'flex', gap: 6, padding: '2px 0' }}>
                <span style={{ color: '#38a169' }}>&bull;</span> {String(s || '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 风险 */}
      {risks.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#c53030', marginBottom: 6 }}>
            <span>⚠️</span> 风险提示
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {risks.map((r, i) => (
              <li key={i} style={{ fontSize: 13, display: 'flex', gap: 6, padding: '3px 0' }}>
                <span style={{
                  padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', lineHeight: '18px',
                  background: r.level === 'high' ? '#fed7d7' : r.level === 'medium' ? '#fefcbf' : '#bee3f8',
                  color: r.level === 'high' ? '#c53030' : r.level === 'medium' ? '#b7791f' : '#2b6cb0',
                }}>
                  {r.level === 'high' ? '高' : r.level === 'medium' ? '中' : '低'}
                </span>
                <span style={{ color: '#555' }}>{String(r.description || '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 建议 */}
      {suggestions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#2b6cb0', marginBottom: 6 }}>
            <span>💡</span> 改进建议
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {suggestions.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: '#555', display: 'flex', gap: 6, padding: '2px 0' }}>
                <span style={{ color: '#3182ce' }}>{i + 1}.</span> {String(s || '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 资产配置评估 */}
      {data.asset_allocation && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#6b46c1', marginBottom: 6 }}>
            <span>🏷️</span> 资产配置评估
          </div>
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>{String(data.asset_allocation)}</p>
        </div>
      )}

      {/* 单只基金分析 */}
      {fundAnalysis.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
            <span>🔍</span> 单只基金分析
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fundAnalysis.map((f, i) => (
              <div key={i} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 10, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>{f.fund_name ?? ''}</div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 2, overflowWrap: 'break-word', wordBreak: 'break-word' }}>📊 {f.evaluation ?? ''}</div>
                <div style={{ fontSize: 13, color: '#3182ce', overflowWrap: 'break-word', wordBreak: 'break-word' }}>💡 {f.suggestion ?? ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const API_KEY_STORAGE = 'ai_api_key'
const FREE_NOTICE = 'AI 调用需消耗 Token，目前仅支持每日免费使用 10 次，请理解～\n也可输入自己的 DeepSeek API Key 不限次数。'

export default function AIChat({ portfolioContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [freeUsed, setFreeUsed] = useState(() => getFreeUsed())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput(''); setLoading(true)

    // 免费次数校验
    if (!apiKey) {
      const currentUsed = getFreeUsed()
      if (currentUsed >= FREE_LIMIT) {
        setFreeUsed(currentUsed)
        setShowKeyInput(true)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ 今日免费 10 次已用完 🙏\n\n' + FREE_NOTICE
        }])
        setLoading(false)
        return
      }
    }

    try {
      const resp = await fetch('https://buhaore.cn/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          portfolio: JSON.parse(portfolioContext || '{}'),
          api_key: apiKey,
        }),
      })
      if (!resp.ok) {
        let detail = ''
        try { const err = await resp.json(); detail = err.detail || '' } catch {}
        if (resp.status === 500) throw new Error('AI 服务异常：' + (detail || '请检查 API Key 是否正确'))
        if (resp.status === 502) throw new Error('DeepSeek 异常：' + (detail || '请检查 API Key 是否正确，或稍后重试'))
        throw new Error('请求失败 (' + resp.status + ')' + (detail ? '：' + detail : ''))
      }
      const data = await resp.json()
      const raw = data.choices?.[0]?.message?.content
      const reply = typeof raw === 'string' ? raw : (raw ? JSON.stringify(raw) : '暂无回复')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])

      // 免费调用成功后才计数
      if (!apiKey) {
        const newUsed = markFreeUsed()
        setFreeUsed(newUsed)
      }
    } catch (e: any) {
      let msg = e.message || '未知错误'
      if (e.name === 'TypeError' && e.message === 'Failed to fetch') msg = '网络连接失败，请检查网络后重试'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    }
    finally { setLoading(false) }
  }

  const renderContent = (text: string) => {
    const parsed = tryParseJSON(text)
    if (parsed) return <AnalysisCard data={parsed} />
    return <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{text}</div>
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>AI 投资顾问</span>
        <span onClick={() => setShowKeyInput(!showKeyInput)} style={{ fontSize: 12, color: '#2563eb', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
          {showKeyInput ? '收起' : apiKey ? '🔑 已配置' : '⚙ 设置 Key'}
        </span>
      </div>

      {showKeyInput && (
        <div style={{ marginBottom: 10, padding: 10, background: '#f0f7ff', borderRadius: 8, border: '1px solid #bddbff' }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); localStorage.setItem(API_KEY_STORAGE, e.target.value) }}
            placeholder="输入你的 DeepSeek API Key..."
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #93c5fd', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', background: '#fff' }}
          />
          <div style={{ fontSize: 10, color: '#2563eb', marginTop: 4 }}>
            Key 仅存本地，不上传服务器
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', marginBottom: 8, fontSize: 13, lineHeight: 1.6 }}>
        {messages.length === 0 && (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>
            你好！我是你的 AI 投资顾问。<br />我可以分析你的持仓和策略，提供建议。
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 14, display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              maxWidth: '88%', padding: '10px 14px', borderRadius: 10,
              background: m.role === 'user' ? '#2563eb' : '#f5f5f5',
              color: m.role === 'user' ? '#fff' : '#333',
              fontSize: m.role === 'user' ? 13 : 14,
            }}>
              {m.role === 'user' ? m.content : renderContent(m.content)}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#999', padding: '4px 12px' }}>AI 思考中...</div>}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="输入你的问题..." disabled={loading}
          style={{ flex: 1, padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13 }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          padding: '8px 14px', border: 'none', borderRadius: 6,
          background: loading ? '#93c5fd' : '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13,
        }}>发送</button>
      </div>
    </div>
  )
}
