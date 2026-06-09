import { FundResult } from '../../types'

export default function FundContribution({ fundResults }: { fundResults: FundResult[] }) {
  const totalFinal = fundResults.reduce((s, f) => s + f.result.finalValue, 0)
  const totalInvested = fundResults.reduce((s, f) => s + f.result.totalInvested, 0)
  const totalProfit = totalFinal - totalInvested

  return (
    <div style={{ marginTop: 12 }}>
      <h4 style={{ margin: '0 0 8px', fontSize: 14, color: '#333' }}>各基金收益贡献</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={thL}>基金</th>
              <th style={thR}>总投入</th>
              <th style={thR}>总资产</th>
              <th style={thR}>收益</th>
              <th style={thR}>收益率</th>
              <th style={thR}>占比</th>
            </tr>
          </thead>
          <tbody>
            {fundResults.map(f => {
              const profit = f.result.finalValue - f.result.totalInvested
              const ret = f.result.totalInvested > 0 ? (f.result.finalValue / f.result.totalInvested - 1) * 100 : 0
              const weight = totalFinal > 0 ? (f.result.finalValue / totalFinal) * 100 : 0
              return (
                <tr key={f.code} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={tdL}>{f.name}</td>
                  <td style={tdR}>¥{Math.round(f.result.totalInvested).toLocaleString()}</td>
                  <td style={tdR}>¥{Math.round(f.result.finalValue).toLocaleString()}</td>
                  <td style={{ ...tdR, color: profit >= 0 ? '#e53e3e' : '#38a169' }}>{profit >= 0 ? '+' : ''}¥{Math.round(profit).toLocaleString()}</td>
                  <td style={{ ...tdR, color: ret >= 0 ? '#e53e3e' : '#38a169' }}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</td>
                  <td style={tdR}>{weight.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thL: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: '#555', fontSize: 11, whiteSpace: 'nowrap' }
const thR: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#555', fontSize: 11, whiteSpace: 'nowrap' }
const tdL: React.CSSProperties = { padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }
const tdR: React.CSSProperties = { padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'monospace' }
