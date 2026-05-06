import { useEffect, useState } from 'react'

export function useObjectUrl(fileOrUrl: File | string): string {
    const [url, setUrl] = useState<string>(typeof fileOrUrl === 'string' ? fileOrUrl : '')

    useEffect(() => {
        if (typeof fileOrUrl === 'string') {
            setUrl(fileOrUrl)
            return
        }
        const objectUrl = URL.createObjectURL(fileOrUrl)
        setUrl(objectUrl)
        return () => {
            URL.revokeObjectURL(objectUrl)
        }
    }, [fileOrUrl])

    return url
}
