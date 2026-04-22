import { addDays, getDay, setHours, setMilliseconds, setMinutes, setSeconds } from 'date-fns'

export function nextSameWeekdayOccurrence(ref: { startTime: string; endTime: string }): {
    startTime: Date
    endTime: Date
} {
    const refStart = new Date(ref.startTime)
    const refEnd = new Date(ref.endTime)
    const durationMs = refEnd.getTime() - refStart.getTime()

    const now = new Date()
    const targetWeekday = getDay(refStart)
    const currentWeekday = getDay(now)

    let candidate = setMilliseconds(
        setSeconds(
            setMinutes(setHours(now, refStart.getHours()), refStart.getMinutes()),
            refStart.getSeconds(),
        ),
        refStart.getMilliseconds(),
    )

    let daysToAdd = (targetWeekday - currentWeekday + 7) % 7
    if (daysToAdd === 0 && candidate.getTime() <= now.getTime()) {
        daysToAdd = 7
    }
    candidate = addDays(candidate, daysToAdd)

    const endCandidate = new Date(candidate.getTime() + durationMs)
    return { startTime: candidate, endTime: endCandidate }
}
