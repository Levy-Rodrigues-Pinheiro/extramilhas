import { useState, useCallback } from 'react'
import { AxiosError } from 'axios'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | null>
  reset: () => void
}

export function useApi<T>(
  apiFunction: (...args: unknown[]) => Promise<{ data: T }>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        const response = await apiFunction(...args)
        setState({ data: response.data, loading: false, error: null })
        return response.data
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          'Erro desconhecido'
        setState({ data: null, loading: false, error: errorMessage })
        return null
      }
    },
    [apiFunction]
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await action()
        return result
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          (err as Error).message ||
          'Erro desconhecido'
        setError(errorMessage)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { loading, error, execute }
}
