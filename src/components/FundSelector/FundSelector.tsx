import { ETF_LIST } from '../../data/etf-list'

interface Props {
  value: string
  onChange: (code: string) => void
}

export default function FundSelector({ value, onChange }: Props) {
  return (
    <div className="card">
      <div className="card-title">选择基金</div>
      <input
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 8,
          boxSizing: 'border-box',
        }}
        placeholder="搜索基金代码或名称..."
        onChange={(e) => {
          const v = e.target.value.trim()
          const found = ETF_LIST.find(
            f => f.code.includes(v) || f.name.includes(v) || f.index.includes(v)
          )
          if (found) onChange(found.code)
        }}
      />
      <div style={{ maxHeight: 260, overflow: 'auto' }}>
        {ETF_LIST.map(etf => (
          <div
            key={etf.code}
            onClick={() => onChange(etf.code)}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              borderRadius: 4,
              fontSize: 13,
              background: value === etf.code ? '#eff6ff' : 'transparent',
              color: value === etf.code ? '#2563eb' : '#333',
              fontWeight: value === etf.code ? 600 : 400,
              borderLeft: value === etf.code ? '3px solid #2563eb' : '3px solid transparent',
            }}
          >
            <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{etf.code}</span>
            {etf.name}
            <span style={{ float: 'right', color: '#999', fontSize: 12 }}>{etf.index}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
