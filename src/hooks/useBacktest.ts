import { useState, useCallback } from 'react'
import { BacktestConfig, BacktestResult } from '../types'
import { loadNavData } from '../utils/csv'
import { runBacktest } from '../engine/strategies'

export interface BacktestState {
  loading: boolean
  error: string | null
  result: BacktestResult | null
}

export function useBacktest() {
  const [state, setState] = useState<BacktestState>({
    loading: false,
    error: null,
    result: null,
  })

  const run = useCallback(async (config: BacktestConfig) => {
    setState({ loading: true, error: null, result: null })
    try {
      const navData = await loadNavData(config.etfCode)
      const result = runBacktest(navData, config)
      setState({ loading: false, error: null, result })
    } catch (err: any) {
      setState({ loading: false, error: err.message || '回测执行失败', result: null })
    }
  }, [])

  const clear = useCallback(() => {
    setState({ loading: false, error: null, result: null })
  }, [])

  return { ...state, run, clear }
}
