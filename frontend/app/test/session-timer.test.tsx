import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionTimer } from '~/components/sessions/SessionTimer'

describe('SessionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-01T10:00:00.000Z'))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('starts at 00:00 and counts from startedAt', () => {
        render(
            <SessionTimer
                startedAt="2026-04-01T10:00:00.000Z"
                startTime="2026-04-01T09:00:00.000Z"
            />,
        )
        expect(screen.getByText('00:00')).toBeInTheDocument()
        act(() => {
            vi.advanceTimersByTime(65 * 60 * 1000)
        })
        expect(screen.getByText('01:05')).toBeInTheDocument()
    })

    it('falls back to startTime when startedAt is null', () => {
        render(<SessionTimer startedAt={null} startTime="2026-04-01T08:30:00.000Z" />)
        expect(screen.getByText('01:30')).toBeInTheDocument()
    })
})
