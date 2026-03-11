import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGetActiveForPsycho = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getActiveForPsycho: (...args: any[]) => mockGetActiveForPsycho(...args),
    },
}))

let mockActiveRole: 'psycho' | 'client' | null = 'psycho'

vi.mock('~/contexts/auth-context', () => ({
    useAuth: () => ({ activeRole: mockActiveRole }),
}))

import { useHasActiveAppointment } from '~/hooks/useHasActiveAppointment'

describe('useHasActiveAppointment', () => {
    beforeEach(() => {
        mockGetActiveForPsycho.mockReset()
        mockActiveRole = 'psycho'
    })

    it('returns false immediately without calling API when activeRole is not psycho', () => {
        mockActiveRole = 'client'

        const { result } = renderHook(() => useHasActiveAppointment())

        expect(result.current.hasActiveAppointment).toBe(false)
        expect(result.current.isLoading).toBe(false)
        expect(mockGetActiveForPsycho).not.toHaveBeenCalled()
    })

    it('returns true when API returns an active appointment', async () => {
        mockActiveRole = 'psycho'
        mockGetActiveForPsycho.mockResolvedValue({
            data: {
                appointment: {
                    id: 'apt-001',
                    status: 'active',
                },
            },
        })

        const { result } = renderHook(() => useHasActiveAppointment())

        await waitFor(() => {
            expect(result.current.hasActiveAppointment).toBe(true)
            expect(result.current.isLoading).toBe(false)
        })
    })

    it('returns false when API returns { appointment: null }', async () => {
        mockActiveRole = 'psycho'
        mockGetActiveForPsycho.mockResolvedValue({
            data: { appointment: null },
        })

        const { result } = renderHook(() => useHasActiveAppointment())

        await waitFor(() => {
            expect(result.current.hasActiveAppointment).toBe(false)
            expect(result.current.isLoading).toBe(false)
        })
    })

    it('returns false silently on API error', async () => {
        mockActiveRole = 'psycho'
        mockGetActiveForPsycho.mockRejectedValue(new Error('Network error'))

        const { result } = renderHook(() => useHasActiveAppointment())

        await waitFor(() => {
            expect(result.current.hasActiveAppointment).toBe(false)
            expect(result.current.isLoading).toBe(false)
        })
    })
})
