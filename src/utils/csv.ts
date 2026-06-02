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

/** 根据代码加载 CSV 文件 */
export async function loadNavData(code: string): Promise<NavRecord[]> {
  const url = `/data/prices/${code}.csv`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`加载 ${code} 数据失败: ${resp.status}`)
  const text = await resp.text()
  return parseNavCSV(text)
}
