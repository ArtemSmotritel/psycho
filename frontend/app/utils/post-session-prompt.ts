const KEY_PREFIX = 'post_session_followup_done:'
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000

export function isPostSessionPromptDone(appointmentId: string): boolean {
    if (typeof window === 'undefined') return true
    try {
        return window.localStorage.getItem(`${KEY_PREFIX}${appointmentId}`) === '1'
    } catch {
        return true
    }
}

export function markPostSessionPromptDone(appointmentId: string): void {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(`${KEY_PREFIX}${appointmentId}`, '1')
    } catch {
        // Ignore quota / privacy errors
    }
}

export function isRecentlyEnded(endedAt: string | null): boolean {
    if (!endedAt) return false
    return Date.now() - new Date(endedAt).getTime() <= RECENT_WINDOW_MS
}
