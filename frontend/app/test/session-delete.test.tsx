import { render, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockDelete = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        start: vi.fn(),
        update: vi.fn(),
        delete: (...args: any[]) => mockDelete(...args),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// Capture the onConfirm and trigger disabled props passed to ConfirmAction
let capturedOnConfirm: (() => void) | null = null
let capturedTriggerDisabled: boolean | undefined = undefined

vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, onConfirm }: any) => {
        capturedOnConfirm = onConfirm
        capturedTriggerDisabled = trigger?.props?.disabled
        return (
            <div>
                {trigger}
                <button data-testid="confirm-btn" onClick={onConfirm}>
                    Confirm
                </button>
            </div>
        )
    },
}))

vi.mock('~/components/SessionForm', () => ({
    SessionForm: ({ trigger }: any) => <div>{trigger}</div>,
}))

vi.mock('~/components/ActionsSection', () => ({
    ActionsSection: ({ children }: any) => <div>{children}</div>,
    ActionItem: ({ label, disabled }: any) => <button disabled={disabled}>{label}</button>,
}))

const mockUpcomingAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 3600000).toISOString(),
    status: 'upcoming' as const,
    googleMeetLink: null,
    createdAt: '2026-03-10T15:00:00.000Z',
}

vi.mock('~/hooks/useCurrentAppointment', () => ({
    useCurrentAppointment: () => ({
        appointment: mockUpcomingAppointment,
        isLoading: false,
    }),
}))

import Session from '~/routes/psychologist/session'
import { toast } from 'sonner'

function renderSession() {
    return render(
        <MemoryRouter initialEntries={['/psycho/clients/client-456/appointments/apt-001']}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId/appointments/:appointmentId"
                    element={<Session />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('Session delete appointment flow', () => {
    beforeEach(() => {
        mockDelete.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
        capturedOnConfirm = null
        capturedTriggerDisabled = undefined
    })

    it('calls appointmentService.delete with correct clientId and appointmentId', async () => {
        mockDelete.mockResolvedValue({ data: { success: true } })

        renderSession()

        await waitFor(() => {
            expect(capturedOnConfirm).not.toBeNull()
        })

        await act(async () => {
            capturedOnConfirm!()
        })

        await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('client-456', 'apt-001')
        })
    })

    it('calls toast.success with "Appointment deleted." on success', async () => {
        mockDelete.mockResolvedValue({ data: { success: true } })

        renderSession()

        await waitFor(() => {
            expect(capturedOnConfirm).not.toBeNull()
        })

        await act(async () => {
            capturedOnConfirm!()
        })

        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Appointment deleted.')
        })
    })

    it('calls navigate to the appointments list URL on success', async () => {
        mockDelete.mockResolvedValue({ data: { success: true } })

        renderSession()

        await waitFor(() => {
            expect(capturedOnConfirm).not.toBeNull()
        })

        await act(async () => {
            capturedOnConfirm!()
        })

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/psycho/clients/client-456/appointments')
        })
    })

    it('calls toast.error with correct message on API failure', async () => {
        mockDelete.mockRejectedValue(new Error('Network error'))

        renderSession()

        await waitFor(() => {
            expect(capturedOnConfirm).not.toBeNull()
        })

        await act(async () => {
            capturedOnConfirm!()
        })

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'Failed to delete appointment. Please try again.',
            )
        })
    })

    it('delete trigger is disabled while isDeleting is true', async () => {
        let resolveDelete!: () => void
        mockDelete.mockReturnValue(
            new Promise<void>((res) => {
                resolveDelete = res
            }),
        )

        renderSession()

        await waitFor(() => {
            expect(capturedOnConfirm).not.toBeNull()
        })

        expect(capturedTriggerDisabled).toBeFalsy()

        act(() => {
            capturedOnConfirm!()
        })

        await waitFor(() => {
            expect(capturedTriggerDisabled).toBe(true)
        })

        resolveDelete()

        await waitFor(() => {
            expect(capturedTriggerDisabled).toBeFalsy()
        })
    })
})
