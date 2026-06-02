import { useState, useRef } from 'react'
import { getETFList, addCustomETF, removeCustomETF, isPresetETF } from '../../data/etf-list'

interface Props { value: string; onChange: (code: string) => void }
interface FundItem { code: string; name: string }

export default function FundSelector({ value, onChange }: Props) {
  // refreshKey triggers re-render after delete
  const list = getETFList()
  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<FundItem[]>([])
  const [fetchingCode, setFetchingCode] = useState('')
  const [successCode, setSuccessCode] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [hiddenPresets, setHiddenPresets] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const timerRef = useRef<any>()

  const filtered = (search.trim()
    ? list.filter(e => e.code.includes(search) || e.name.includes(search))
    : list).filter(e => !hiddenPresets.includes(e.code))

  const handleDelete = (code: string) => {
    if (isPresetETF(code)) {
      setHiddenPresets([...hiddenPresets, code])
    } else {
      removeCustomETF(code)
      setRefreshKey(k => k + 1)  // 强制刷新
    }
  }

  const handleSearchAdd = (q: string) => {
    setAddQuery(q)
    clearTimeout(timerRef.current)
    if (q.trim().length < 1) { setAddResults([]); return }
    timerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/funds/search?q=${encodeURIComponent(q)}`)
        if (resp.ok) { const d = await resp.json(); setAddResults((d.results || []).slice(0, 10)) }
      } catch {}
    }, 200)
  }

  const handleAddFund = async (r: FundItem) => {
    if (list.some(e => e.code === r.code)) { onChange(r.code); setAddMode(false); return }
    setFetchingCode(r.code)
    try {
      const resp = await fetch(`/api/fetch/${r.code}`, { method: 'POST' })
      if (resp.ok) {
        addCustomETF({ code: r.code, name: r.name, index: '' })
        setSuccessCode(r.code)
        onChange(r.code)
        setTimeout(() => { setAddMode(false); setAddQuery(''); setAddResults([]); setSuccessCode('') }, 1000)
      }
    } catch {}
    finally { setFetchingCode('') }
  }

  return (
    <div className="card">
      <div className="card-title">选择基金</div>

      <input style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="搜索已加载的基金..." />

      <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 8 }}>
        {filtered.length === 0
          ? <div style={{ fontSize: 12, color: '#999', padding: 12, textAlign: 'center' }}>未找到匹配基金</div>
          : filtered.map(etf => (
          <div key={etf.code} onClick={() => { if (!editMode) onChange(etf.code) }} style={{
            padding: '6px 10px', cursor: editMode ? 'default' : 'pointer', borderRadius: 4, fontSize: 13,
            background: value === etf.code ? '#eff6ff' : 'transparent',
            color: value === etf.code ? '#2563eb' : '#333',
            fontWeight: value === etf.code ? 600 : 400,
            borderLeft: value === etf.code ? '3px solid #2563eb' : '3px solid transparent',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span><span style={{ fontFamily: 'monospace', marginRight: 8 }}>{etf.code}</span>{etf.name}</span>
            {editMode && <span onClick={(e) => { e.stopPropagation(); handleDelete(etf.code) }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>–</span>}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {!addMode && !editMode && <button onClick={() => setEditMode(true)} style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, color: '#666' }}>编辑</button>}
          {editMode && <button onClick={() => setEditMode(false)} style={{ padding: '4px 8px', border: '1px solid #2563eb', borderRadius: 4, background: '#eff6ff', cursor: 'pointer', fontSize: 12, color: '#2563eb' }}>完成</button>}
          {addMode ? (
            <>
              <input autoFocus value={addQuery} onChange={e => handleSearchAdd(e.target.value)}
                placeholder="搜索全市场基金..." style={{ flex: 1, padding: '6px 8px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 12 }} />
              <button onClick={() => { setAddMode(false); setAddQuery(''); setAddResults([]) }} style={{ padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12 }}>取消</button>
            </>
          ) : (
            <button onClick={() => setAddMode(true)} style={{
              width: '100%', padding: '5px 0', border: '1px dashed #d9d9d9', borderRadius: 4,
              background: '#fafafa', color: '#666', fontSize: 12, cursor: 'pointer',
            }}>＋ 添加基金</button>
          )}
        </div>
        {addMode && addQuery.trim().length >= 1 && addResults.length === 0 && fetchingCode === '' && (
          <div style={{ fontSize: 11, color: '#999' }}>未找到匹配基金</div>
        )}
        {addMode && addResults.map(r => (
          <div key={r.code} onClick={() => handleAddFund(r)}
            style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 3, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{r.name} <span style={{ color: '#999' }}>({r.code})</span></span>
            <span style={{ fontSize: 11, flexShrink: 0 }}>
              {fetchingCode === r.code ? <span style={{ color: '#e67e22' }}>⟳ 拉取中...</span>
                : successCode === r.code ? <span style={{ color: '#38a169' }}>✓ 已添加</span>
                : <span style={{ color: '#2563eb' }}>＋ 添加</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
