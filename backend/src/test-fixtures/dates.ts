/**
 * Helpers to generate ISO date strings relative to now.
 * Use these instead of hardcoded dates so tests never go stale.
 */

/** Returns an ISO string for `days` days from now at the given hour (UTC). */
export function futureDate(days: number, hour = 10): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + days)
    d.setUTCHours(hour, 0, 0, 0)
    return d.toISOString()
}

/** Returns an ISO string for `days` days ago at the given hour (UTC). */
export function pastDate(days: number, hour = 10): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - days)
    d.setUTCHours(hour, 0, 0, 0)
    return d.toISOString()
}
