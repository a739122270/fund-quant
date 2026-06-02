import { ETFInfo } from '../types'

const PRESET_ETFS: ETFInfo[] = [
  { code: '005102', name: '工银沪深300ETF联接A',        index: '' },
  { code: '001592', name: '天弘创业板ETF联接A',         index: '' },
  { code: '161725', name: '招商中证白酒指数(LOF)A',     index: '' },
  { code: '110003', name: '易方达上证50指数(LOF)A',     index: '' },
  { code: '000311', name: '景顺长城沪深300指数增强',    index: '' },
  { code: '110011', name: '易方达中小盘混合',           index: '' },
  { code: '001714', name: '工银文体产业股票',            index: '' },
  { code: '163406', name: '兴全合润混合(LOF)',          index: '' },
  { code: '001938', name: '中欧时代先锋股票A',           index: '' },
  { code: '000083', name: '汇添富消费行业混合',          index: '' },
  { code: '260108', name: '景顺长城新兴成长混合A',       index: '' },
  { code: '040008', name: '华安策略优选混合',            index: '' },
  { code: '110035', name: '易方达双债增强债券A',         index: '' },
  { code: '000216', name: '华安黄金易ETF联接A',          index: '' },
  { code: '270002', name: '广发稳健增长混合A',           index: '' },
]

const STORAGE_KEY = 'custom_etfs'

function loadCustomETFs(): ETFInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCustomETFs(list: ETFInfo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function getETFList(): ETFInfo[] {
  return [...PRESET_ETFS, ...loadCustomETFs()]
}

export function addCustomETF(etf: ETFInfo) {
  const list = loadCustomETFs()
  if (!list.some(e => e.code === etf.code)) {
    list.push(etf)
    saveCustomETFs(list)
  }
}

export function isPresetETF(code: string): boolean {
  return PRESET_ETFS.some(e => e.code === code)
}

export function removeCustomETF(code: string) {
  const list = loadCustomETFs()
  const idx = list.findIndex(e => e.code === code)
  if (idx !== -1) {
    list.splice(idx, 1)
    saveCustomETFs(list)
  }
}
