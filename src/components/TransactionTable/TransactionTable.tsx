import { useState } from 'react'
import { TradeRecord } from '../../types'
import { formatMoney, formatPercent } from '../../utils/format'

interface Props {
  trades: (TradeRecord & { fundName?: string })[]
}

export default function TransactionTable({ trades }: Props) {
  const [page, setPage] = useState(1)
  const pageSize = 20
  const totalPages = Math.ceil(trades.length / pageSize)
  const paged = trades.slice((page - 1) * pageSize, page * pageSize)

  if (trades.length === 0) return null

  return (
    <div className="card">
      <div className="card-title">交易明细（共 {trades.length} 笔）</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              {trades[0]?.fundName && <th style={thStyle}>基金</th>}
              <th style={thStyle}>日期</th>
              <th style={thStyle}>操作</th>
              <th style={thStyle}>净值</th>
              <th style={thStyle}>金额</th>
              <th style={thStyle}>费用</th>
              <th style={thStyle}>份额</th>
              <th style={thStyle}>累计份额</th>
              <th style={thStyle}>累计投入</th>
              <th style={thStyle}>持仓市值</th>
              <th style={thStyle}>收益率</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((t, i) => (
              <tr key={i} style={{
                borderBottom: '1px solid #f0f0f0',
                background: t.action === 'sell' ? '#fff5f5' : undefined,
              }}>
                {t.fundName && <td style={tdStyle}>{t.fundName}</td>}
                <td style={tdStyle}>{t.date}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{
                    color: t.action === 'sell' ? '#e53e3e' : '#2563eb',
                    fontWeight: 600,
                    fontSize: 11,
                  }}>
                    {t.action === 'sell' ? '卖出' : '买入'}
                  </span>
                </td>
                <td style={tdStyle}>{t.nav.toFixed(4)}</td>
                <td style={tdStyle}>{formatMoney(t.investAmount)}</td>
                <td style={tdStyle}>{formatMoney(t.fee)}</td>
                <td style={tdStyle}>{t.shares.toFixed(2)}</td>
                <td style={tdStyle}>{t.totalShares.toFixed(2)}</td>
                <td style={tdStyle}>{formatMoney(t.totalInvested)}</td>
                <td style={tdStyle}>{formatMoney(t.marketValue)}</td>
                <td style={{
                  ...tdStyle,
                  color: t.action === 'sell' ? '#e53e3e' : (t.return >= 0 ? '#e53e3e' : '#38a169'),
                }}>
                  {t.action === 'sell' ? `止盈 ${formatPercent(t.return)}` : formatPercent(t.return)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pageBtnStyle}>
            上一页
          </button>
          <span style={{ margin: '0 12px', fontSize: 12, color: '#666' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pageBtnStyle}>
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  textAlign: 'right',
  fontWeight: 600,
  color: '#555',
  fontSize: 11,
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '6px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  fontFamily: 'monospace',
  fontSize: 12,
}

const pageBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
}
