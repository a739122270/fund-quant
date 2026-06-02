import { useState } from 'react'
import { BacktestConfig } from '../../types'

interface Props {
  etfCode: string
  onRun: (config: BacktestConfig) => void
  loading: boolean
}

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }

function SectionHeader({
  enabled, onToggle, expanded, onExpand, label, color,
}: {
  enabled: boolean; onToggle: (v: boolean) => void
  expanded: boolean; onExpand: () => void
  label: string; color: string
}) {
  return (
    <div style={{ borderTop: '1px solid #eee', margin: '10px 0', paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} style={{ margin: 0 }} />
        <span onClick={onExpand} style={{ flex: 1, fontSize: 13, fontWeight: 600, color: enabled ? color : "#999", cursor: "pointer", userSelect: "none" }}>
          {label}
        </span>
        <span onClick={onExpand} style={{ fontSize: 10, color: "#333", cursor: "pointer", userSelect: "none", lineHeight: 1 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>
    </div>
  )
}

export default function ConfigPanel({ etfCode, onRun, loading }: Props) {
  const now = new Date()
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

  const [startDate, setStartDate] = useState(toDateStr(threeYearsAgo))
  const [endDate, setEndDate] = useState(toDateStr(now))
  const [strategy, setStrategy] = useState<'dca' | 'lump_sum'>('dca')
  const [amount, setAmount] = useState(1000)
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly')
  const [dayOfMonth, setDayOfMonth] = useState(10)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [feeRate, setFeeRate] = useState(0.0015)

  // 智能定投
  const [sdEnabled, setSdEnabled] = useState(false)
  const [sdExpanded, setSdExpanded] = useState(false)
  const [sdLowPct, setSdLowPct] = useState(30)
  const [sdHighPct, setSdHighPct] = useState(70)
  const [sdLowMul, setSdLowMul] = useState(150)
  const [sdMidMul, setSdMidMul] = useState(100)
  const [sdHighMul, setSdHighMul] = useState(50)

  // 补仓
  const [dbEnabled, setDbEnabled] = useState(false)
  const [dbExpanded, setDbExpanded] = useState(false)
  const [dbT1Th, setDbT1Th] = useState(10)
  const [dbT1Pct, setDbT1Pct] = useState(20)
  const [dbT2Th, setDbT2Th] = useState(20)
  const [dbT2Pct, setDbT2Pct] = useState(40)

  // 止盈
  const [tpEnabled, setTpEnabled] = useState(false)
  const [tpExpanded, setTpExpanded] = useState(false)
  const [tpT1Th, setTpT1Th] = useState(20)
  const [tpT1R, setTpT1R] = useState(50)
  const [tpT2Th, setTpT2Th] = useState(50)
  const [tpT2R, setTpT2R] = useState(80)

  // 止损
  const [slEnabled, setSlEnabled] = useState(false)
  const [slExpanded, setSlExpanded] = useState(false)
  const [slT1Th, setSlT1Th] = useState(10)
  const [slT1R, setSlT1R] = useState(50)
  const [slT2Th, setSlT2Th] = useState(20)
  const [slT2R, setSlT2R] = useState(80)

  const handleRun = () => {
    if (!etfCode) return
    const dB = []
    if (dbT1Th > 0 && dbT1Pct > 0) dB.push({ thresholdPercent: dbT1Th, investPercent: dbT1Pct })
    if (dbT2Th > 0 && dbT2Pct > 0) dB.push({ thresholdPercent: dbT2Th, investPercent: dbT2Pct })
    const tP = []
    if (tpT1Th > 0 && tpT1R > 0) tP.push({ thresholdPercent: tpT1Th, sellRatio: tpT1R })
    if (tpT2Th > 0 && tpT2R > 0) tP.push({ thresholdPercent: tpT2Th, sellRatio: tpT2R })
    const sL = []
    if (slT1Th > 0 && slT1R > 0) sL.push({ thresholdPercent: slT1Th, sellRatio: slT1R })
    if (slT2Th > 0 && slT2R > 0) sL.push({ thresholdPercent: slT2Th, sellRatio: slT2R })
    onRun({
      etfCode, strategy, startDate, endDate, amount, frequency, dayOfWeek, dayOfMonth, feeRate,
      dipBuy: dbEnabled && dB.length > 0 ? { enabled: true, tiers: dB } : undefined,
      takeProfit: tpEnabled && tP.length > 0 ? { enabled: true, tiers: tP } : undefined,
      stopLoss: slEnabled && sL.length > 0 ? { enabled: true, tiers: sL } : undefined,
      smartDCA: sdEnabled ? { enabled: true, lookbackDays: 756, lowPercentile: sdLowPct, highPercentile: sdHighPct, lowMultiplier: sdLowMul, midMultiplier: sdMidMul, highMultiplier: sdHighMul } : undefined,
    })
  }

  return (
    <div className="card">
      <div className="card-title">参数配置</div>

      <div style={fS}>
        <label style={lS}>策略类型</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStrategy('dca')} style={btnS(strategy === 'dca')}>定期定额</button>
          <button onClick={() => setStrategy('lump_sum')} style={btnS(strategy === 'lump_sum')}>一次性投资</button>
        </div>
      </div>
      <div style={fS}>
        <label style={lS}>开始日期</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={iS} />
      </div>
      <div style={fS}>
        <label style={lS}>结束日期</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={iS} />
      </div>

      {strategy === 'dca' && (
        <>
          <div style={fS}>
            <label style={lS}>基础每期金额 (元)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={iS} min={100} step={100} />
          </div>
          <div style={fS}>
            <label style={lS}>定投频率</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as any)} style={iS}>
              <option value="weekly">每周</option>
              <option value="biweekly">每两周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          {frequency === 'monthly' && (
            <div style={fS}>
              <label style={lS}>每月几号</label>
              <select value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))} style={iS}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}号</option>)}
              </select>
            </div>
          )}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <div style={fS}>
              <label style={lS}>周几定投</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} style={iS}>
                {[1,2,3,4,5].map(d => <option key={d} value={d}>周{d}</option>)}
              </select>
            </div>
          )}
        </>
      )}

      {strategy === 'lump_sum' && (
        <div style={fS}>
          <label style={lS}>投入金额 (元)</label>
          <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} style={iS} min={100} />
        </div>
      )}

      <div style={fS}>
        <label style={lS}>申购费率</label>
        <select value={feeRate} onChange={e => setFeeRate(Number(e.target.value))} style={iS}>
          <option value={0}>0%</option>
          <option value={0.001}>0.1%</option>
          <option value={0.0015}>0.15%</option>
          <option value={0.003}>0.3%</option>
          <option value={0.005}>0.5%</option>
        </select>
      </div>

      {/* 智能定投 */}
      {strategy === 'dca' && (
        <>
          <SectionHeader enabled={sdEnabled} onToggle={setSdEnabled} expanded={sdExpanded} onExpand={() => setSdExpanded(!sdExpanded)} label="📊 智能定投" color="#e67e22" />
          {sdExpanded && (
            <div style={{ paddingLeft: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>NAV 历史百分位动态调整每期金额</div>
              <div style={fS}>
                <label style={lS}>低估: &lt;{sdLowPct}% → {sdLowMul}%</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" value={sdLowPct} onChange={e => setSdLowPct(Number(e.target.value))} style={{ ...iS, width: 60 }} min={5} max={50} /><span style={{fontSize:12}}>%</span>
                  <span style={{fontSize:12}}>→ 投</span>
                  <input type="number" value={sdLowMul} onChange={e => setSdLowMul(Number(e.target.value))} style={{...iS, width: 60}} min={100} max={500} /><span style={{fontSize:12}}>%</span>
                </div>
              </div>
              <div style={fS}>
                <label style={lS}>正常: {sdLowPct}%~{sdHighPct}% → {sdMidMul}%</label>
                <input type="number" value={sdMidMul} onChange={e => setSdMidMul(Number(e.target.value))} style={{...iS, width: 80}} min={50} max={200} />
              </div>
              <div style={fS}>
                <label style={lS}>高估: &gt;{sdHighPct}% → {sdHighMul}%</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" value={sdHighPct} onChange={e => setSdHighPct(Number(e.target.value))} style={{...iS, width: 60}} min={50} max={95} /><span style={{fontSize:12}}>%</span>
                  <span style={{fontSize:12}}>→ 投</span>
                  <input type="number" value={sdHighMul} onChange={e => setSdHighMul(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={100} /><span style={{fontSize:12}}>%</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 补仓 */}
      <SectionHeader enabled={dbEnabled} onToggle={setDbEnabled} expanded={dbExpanded} onExpand={() => setDbExpanded(!dbExpanded)} label="📉 补仓策略" color="#2563eb" />
      {dbExpanded && (
        <div style={{ paddingLeft: 4, marginBottom: 10 }}>
          <div style={fS}>
            <label style={lS}>触发 1: 持仓亏损</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={dbT1Th} onChange={e => setDbT1Th(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={50} /><span style={{fontSize:12}}>% → 追加</span>
              <input type="number" value={dbT1Pct} onChange={e => setDbT1Pct(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={1000} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
          <div style={fS}>
            <label style={lS}>触发 2: 持仓亏损 (可选)</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={dbT2Th} onChange={e => setDbT2Th(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={50} /><span style={{fontSize:12}}>% → 追加</span>
              <input type="number" value={dbT2Pct} onChange={e => setDbT2Pct(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={1000} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
        </div>
      )}

      {/* 止盈 */}
      <SectionHeader enabled={tpEnabled} onToggle={setTpEnabled} expanded={tpExpanded} onExpand={() => setTpExpanded(!tpExpanded)} label="🎯 止盈策略" color="#e53e3e" />
      {tpExpanded && (
        <div style={{ paddingLeft: 4, marginBottom: 10 }}>
          <div style={fS}>
            <label style={lS}>触发 1: 从最高点回落</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={tpT1Th} onChange={e => setTpT1Th(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={500} /><span style={{fontSize:12}}>% → 卖</span>
              <input type="number" value={tpT1R} onChange={e => setTpT1R(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={100} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
          <div style={fS}>
            <label style={lS}>触发 2: 从最高点回落 (可选)</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={tpT2Th} onChange={e => setTpT2Th(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={500} /><span style={{fontSize:12}}>% → 卖</span>
              <input type="number" value={tpT2R} onChange={e => setTpT2R(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={100} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
        </div>
      )}

      {/* 止损 */}
      <SectionHeader enabled={slEnabled} onToggle={setSlEnabled} expanded={slExpanded} onExpand={() => setSlExpanded(!slExpanded)} label="🛑 止损策略" color="#e53e3e" />
      {slExpanded && (
        <div style={{ paddingLeft: 4, marginBottom: 10 }}>
          <div style={fS}>
            <label style={lS}>触发 1: 亏损达到</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={slT1Th} onChange={e => setSlT1Th(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={100} /><span style={{fontSize:12}}>% → 卖</span>
              <input type="number" value={slT1R} onChange={e => setSlT1R(Number(e.target.value))} style={{...iS, width: 60}} min={1} max={100} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
          <div style={fS}>
            <label style={lS}>触发 2: 亏损达到 (可选)</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={slT2Th} onChange={e => setSlT2Th(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={100} /><span style={{fontSize:12}}>% → 卖</span>
              <input type="number" value={slT2R} onChange={e => setSlT2R(Number(e.target.value))} style={{...iS, width: 60}} min={0} max={100} /><span style={{fontSize:12}}>%</span>
            </div>
          </div>
        </div>
      )}

      <button onClick={handleRun} disabled={loading || !etfCode} style={{
        width: '100%', padding: '10px 0', background: loading ? '#93c5fd' : '#2563eb',
        color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
      }}>
        {loading ? '回测计算中...' : '▶ 开始回测'}
      </button>
    </div>
  )
}

const fS: React.CSSProperties = { marginBottom: 10 }
const lS: React.CSSProperties = { display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }
const iS: React.CSSProperties = { padding: '7px 10px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }
function btnS(a: boolean): React.CSSProperties {
  return { flex: 1, padding: '6px 0', border: a ? '2px solid #2563eb' : '1px solid #d9d9d9', borderRadius: 6, background: a ? '#eff6ff' : '#fff', color: a ? '#2563eb' : '#666', fontWeight: a ? 600 : 400, cursor: 'pointer', fontSize: 13 }
}
