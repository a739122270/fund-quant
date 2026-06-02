import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  /** 组合配置的 JSON 字符串，发送给 AI */
  portfolioContext: string
}

export default function AIChat({ portfolioContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput(''); setLoading(true)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          portfolio: JSON.parse(portfolioContext || '{}'),
        }),
      })
      if (!resp.ok) throw new Error('请求失败')
      const data = await resp.json()
      const reply = data.choices?.[0]?.message?.content || '暂无回复'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message || '网络错误'}` }])
    }
    finally { setLoading(false) }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 460 }}>
      <div className="card-title">AI 投资顾问</div>

      <div style={{ flex: 1, overflow: 'auto', marginBottom: 8, fontSize: 13, lineHeight: 1.6 }}>
        {messages.length === 0 && (
          <div style={{ color: '#999', padding: 16, textAlign: 'center' }}>
            你好！我是你的 AI 投资顾问。<br />我可以分析你的持仓和策略，提供建议。试试问：
            <div style={{ marginTop: 8, fontSize: 12 }}>
              • "我的组合风险怎么样？"
              <br />• "当前市场环境下建议调整吗？"
              <br />• "沪深300的配置合理吗？"
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: 8, whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? '#2563eb' : '#f0f0f0',
              color: m.role === 'user' ? '#fff' : '#333',
            }}>{m.content}</div>
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
