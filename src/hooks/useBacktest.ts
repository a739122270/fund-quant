import { useState, useCallback } from 'react'
import { BacktestConfig, BacktestResult } from '../types'
import { loadNavData, shouldRefresh, refreshFundData } from '../utils/csv'
import { runBacktest } from '../engine/strategies'

export interface BacktestState {
  loading: boolean
  refreshing: boolean
  error: string | null
  result: BacktestResult | null
}

export function useBacktest() {
  const [state, setState] = useState<BacktestState>({
    loading: false,
    refreshing: false,
    error: null,
    result: null,
  })

  const run = useCallback(async (config: BacktestConfig) => {
    setState({ loading: true, refreshing: false, error: null, result: null })
    try {
      if (shouldRefresh(config.etfCode)) {
        setState({ loading: true, refreshing: true, error: null, result: null })
        await refreshFundData(config.etfCode)
      }
      setState({ loading: true, refreshing: false, error: null, result: null })
      const navData = await loadNavData(config.etfCode)
      const result = runBacktest(navData, config)
      setState({ loading: false, refreshing: false, error: null, result })
    } catch (err: any) {
      setState({ loading: false, refreshing: false, error: err.message || '回测执行失败', result: null })
    }
  }, [])

  const clear = useCallback(() => {
    setState({ loading: false, refreshing: false, error: null, result: null })
  }, [])

  return { ...state, run, clear }
}
