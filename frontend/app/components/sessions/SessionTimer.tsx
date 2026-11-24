import { useEffect, useState } from 'react'

interface SessionTimerProps {
    /** When the session began. Falls back to the scheduled start time. */
    startedAt: string | null
    startTime: string
}

function formatElapsed(since: number): string {
    const elapsed = Math.max(0, Date.now() - since)
    const hours = Math.floor(elapsed / (1000 * 60 * 60))
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

export function SessionTimer({ startedAt, startTime }: SessionTimerProps) {
    const since = new Date(startedAt ?? startTime).getTime()
    const [time, setTime] = useState(() => formatElapsed(since))

    useEffect(() => {
        const tick = () => setTime(formatElapsed(since))
        tick()
        const timer = setInterval(tick, 1000)
        return () => clearInterval(timer)
    }, [since])

    return <span className="text-lg font-mono tabular-nums">{time}</span>
}
