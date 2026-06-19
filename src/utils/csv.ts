import { NavRecord } from '../types'

/** 解析 ETF 净值 CSV 文本 */
export function parseNavCSV(text: string): NavRecord[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const records: NavRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 3) continue

    const date = cols[0].trim()
    const close = parseFloat(cols[2])

    if (!date || isNaN(close) || close <= 0) continue

    records.push({ date, nav: close })
  }

  return records.sort((a, b) => a.date.localeCompare(b.date))
}

/** 根据代码加载净值数据（优先读 CSV，失败则调 API） */
export async function loadNavData(code: string): Promise<NavRecord[]> {
  const url = `${import.meta.env.BASE_URL}data/prices/${code}.csv`
  const resp = await fetch(url)
  if (resp.ok) {
    const text = await resp.text()
    return parseNavCSV(text)
  }
  // CSV 不存在（Vercel 环境），调 API 拿 JSON
  const apiResp = await fetch(`/api/data/${code}`)
  if (!apiResp.ok) throw new Error(`加载 ${code} 数据失败: ${apiResp.status}`)
  const records: any[] = await apiResp.json()
  return records
    .map(r => ({ date: r.date, nav: parseFloat(r.close) }))
    .filter(r => !isNaN(r.nav) && r.nav > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

const FETCH_COOLDOWN_MS = 30 * 60 * 1000

/** 检查某只基金是否需要刷新（距上次拉取不到 5 分钟则跳过） */
export function shouldRefresh(code: string): boolean {
  const key = `etf_last_fetch_${code}`
  const lastFetch = localStorage.getItem(key)
  if (lastFetch) {
    const elapsed = Date.now() - parseInt(lastFetch, 10)
    if (elapsed < FETCH_COOLDOWN_MS) return false
  }
  return true
}

/** 拉取单只基金最新数据，更新 CSV 并记录时间 */
export async function refreshFundData(code: string): Promise<void> {
  const resp = await fetch(`/api/fetch/${code}`, { method: 'POST' })
  if (!resp.ok) throw new Error(`拉取 ${code} 数据失败`)
  localStorage.setItem(`etf_last_fetch_${code}`, Date.now().toString())
}

/** 批量刷新基金数据 */
export async function refreshAllFundData(codes: string[]): Promise<void> {
  const toRefresh = codes.filter(shouldRefresh)
  if (toRefresh.length === 0) return
  await Promise.all(toRefresh.map(code => refreshFundData(code)))
}
