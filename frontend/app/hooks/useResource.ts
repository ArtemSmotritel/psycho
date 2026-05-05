import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface UseResourceOptions<T> {
    initial?: T | null
    errorMessage?: string
    enabled?: boolean
}

export interface UseResourceResult<T> {
    data: T | null
    isLoading: boolean
    error: string | null
    refetch: () => void
}

export function useResource<T>(
    fetcher: () => Promise<T>,
    deps: DependencyList,
    options: UseResourceOptions<T> = {},
): UseResourceResult<T> {
    const initial = options.initial ?? null
    const { errorMessage, enabled = true } = options

    const [data, setData] = useState<T | null>(initial)
    const [isLoading, setIsLoading] = useState<boolean>(enabled)
    const [error, setError] = useState<string | null>(null)

    const run = useCallback(() => {
        if (!enabled) {
            setData(initial)
            setError(null)
            setIsLoading(false)
            return
        }
        setIsLoading(true)
        setError(null)
        fetcher()
            .then((value) => {
                setData(value)
            })
            .catch((e) => {
                setData(initial)
                if (errorMessage !== undefined) {
                    setError(errorMessage)
                } else {
                    setError(e.message)
                }
            })
            .finally(() => {
                setIsLoading(false)
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    useEffect(() => {
        run()
    }, [run])

    return { data, isLoading, error, refetch: run }
}
