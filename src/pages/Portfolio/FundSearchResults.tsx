import { useEffect, useState } from 'react'

interface Props {
  query: string
  onSelect: (code: string, name: string) => void
  exclude: string[]
}

interface FundItem {
  code: string
  name: string
}

export default function FundSearchResults({ query, onSelect, exclude }: Props) {
  const [results, setResults] = useState<FundItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const resp = await fetch(`/api/funds/search?q=${encodeURIComponent(query)}`)
        if (resp.ok) {
          const data = await resp.json()
          setResults((data.results || []).filter((r: FundItem) => !exclude.includes(r.code)).slice(0, 15))
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, exclude])

  if (results.length === 0 && !loading) return null

  return (
    <div style={{ maxHeight: 180, overflow: 'auto', fontSize: 12, border: '1px solid #eee', borderRadius: 4, marginTop: 4 }}>
      {loading && <div style={{ padding: 8, color: '#999' }}>搜索中...</div>}
      {results.map(r => (
        <div key={r.code} onClick={() => onSelect(r.code, r.name)}
          style={{ padding: '5px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{r.name} <span style={{ color: '#999' }}>({r.code})</span></span>
        </div>
      ))}
    </div>
  )
}
