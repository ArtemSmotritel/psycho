import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

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

    const activeTokenRef = useRef(0)

    const run = useCallback(() => {
        if (!enabled) {
            activeTokenRef.current += 1
            setData(initial)
            setError(null)
            setIsLoading(false)
            return
        }
        const token = ++activeTokenRef.current
        setIsLoading(true)
        setError(null)
        fetcher()
            .then((value) => {
                if (token !== activeTokenRef.current) return
                setData(value)
            })
            .catch((e) => {
                if (token !== activeTokenRef.current) return
                setData(initial)
                if (errorMessage !== undefined) {
                    setError(errorMessage)
                } else {
                    setError(e.message)
                }
            })
            .finally(() => {
                if (token !== activeTokenRef.current) return
                setIsLoading(false)
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    useEffect(() => {
        run()
        return () => {
            activeTokenRef.current += 1
        }
    }, [run])

    return { data, isLoading, error, refetch: run }
}
