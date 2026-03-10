import { render, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockUpdate = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        start: vi.fn(),
        update: (...args: any[]) => mockUpdate(...args),
        delete: vi.fn(),
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

// Capture the onSubmit and isLoading props passed to the edit SessionForm
let capturedOnSubmit: ((values: any) => void) | null = null
let capturedIsLoading: boolean | undefined = undefined

vi.mock('~/components/SessionForm', () => ({
    SessionForm: ({ mode, onSubmit, isLoading, trigger }: any) => {
        if (mode === 'edit') {
            capturedOnSubmit = onSubmit
            capturedIsLoading = isLoading
        }
        return (
            <div>
                {trigger}
                {mode === 'edit' && isLoading && <button disabled>Saving…</button>}
            </div>
        )
    },
}))

vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger }: any) => <div>{trigger}</div>,
}))

vi.mock('~/components/ActionsSection', () => ({
    ActionsSection: ({ children }: any) => <div>{children}</div>,
    ActionItem: ({ label }: any) => <button>{label}</button>,
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

describe('Session edit appointment flow', () => {
    beforeEach(() => {
        mockUpdate.mockReset()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
        capturedOnSubmit = null
        capturedIsLoading = undefined
    })

    it('calls appointmentService.update with correct args and ISO-string times on submit', async () => {
        mockUpdate.mockResolvedValue({
            data: {
                appointment: {
                    id: 'apt-001',
                    clientId: 'client-456',
                    psychoId: 'psycho-123',
                    startTime: '2026-04-02T10:00:00.000Z',
                    endTime: '2026-04-02T11:00:00.000Z',
                    status: 'upcoming',
                    googleMeetLink: null,
                    createdAt: '2026-03-10T15:00:00.000Z',
                },
            },
        })

        renderSession()

        await waitFor(() => {
            expect(capturedOnSubmit).not.toBeNull()
        })

        const startTime = new Date('2026-04-02T10:00:00.000Z')
        const endTime = new Date('2026-04-02T11:00:00.000Z')

        await act(async () => {
            capturedOnSubmit!({
                startTime,
                endTime,
                clientId: 'client-456',
                googleMeetLink: 'https://meet.google.com/abc',
                generateGoogleMeet: false,
            })
        })

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('client-456', 'apt-001', {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                googleMeetLink: 'https://meet.google.com/abc',
            })
        })
    })

    it('converts empty googleMeetLink to null in the DTO', async () => {
        mockUpdate.mockResolvedValue({ data: { appointment: {} } })

        renderSession()

        await waitFor(() => {
            expect(capturedOnSubmit).not.toBeNull()
        })

        const startTime = new Date('2026-04-02T10:00:00.000Z')
        const endTime = new Date('2026-04-02T11:00:00.000Z')

        await act(async () => {
            capturedOnSubmit!({
                startTime,
                endTime,
                clientId: 'client-456',
                googleMeetLink: '',
                generateGoogleMeet: false,
            })
        })

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith('client-456', 'apt-001', {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                googleMeetLink: null,
            })
        })
    })

    it('shows toast.success on successful update', async () => {
        mockUpdate.mockResolvedValue({ data: { appointment: {} } })

        renderSession()

        await waitFor(() => {
            expect(capturedOnSubmit).not.toBeNull()
        })

        await act(async () => {
            capturedOnSubmit!({
                startTime: new Date('2026-04-02T10:00:00.000Z'),
                endTime: new Date('2026-04-02T11:00:00.000Z'),
                clientId: 'client-456',
                generateGoogleMeet: false,
            })
        })

        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Appointment updated.')
        })
    })

    it('shows toast.error on API failure', async () => {
        mockUpdate.mockRejectedValue(new Error('Network error'))

        renderSession()

        await waitFor(() => {
            expect(capturedOnSubmit).not.toBeNull()
        })

        await act(async () => {
            capturedOnSubmit!({
                startTime: new Date('2026-04-02T10:00:00.000Z'),
                endTime: new Date('2026-04-02T11:00:00.000Z'),
                clientId: 'client-456',
                generateGoogleMeet: false,
            })
        })

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'Failed to update appointment. Please try again.',
            )
        })
    })

    it('passes isLoading=false to SessionForm initially', async () => {
        mockUpdate.mockResolvedValue({ data: { appointment: {} } })

        renderSession()

        await waitFor(() => {
            expect(capturedIsLoading).toBe(false)
        })
    })

    it('submit button is disabled while update is in progress', async () => {
        let resolveUpdate!: () => void
        mockUpdate.mockReturnValue(
            new Promise<void>((res) => {
                resolveUpdate = res
            }),
        )

        renderSession()

        await waitFor(() => {
            expect(capturedOnSubmit).not.toBeNull()
        })

        act(() => {
            capturedOnSubmit!({
                startTime: new Date('2026-04-02T10:00:00.000Z'),
                endTime: new Date('2026-04-02T11:00:00.000Z'),
                clientId: 'client-456',
                generateGoogleMeet: false,
            })
        })

        await waitFor(() => {
            expect(capturedIsLoading).toBe(true)
        })

        resolveUpdate()

        await waitFor(() => {
            expect(capturedIsLoading).toBe(false)
        })
    })
})
