import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockStart = vi.fn()
const mockDelete = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        start: (...args: any[]) => mockStart(...args),
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

vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, onConfirm }: any) => {
        return (
            <div>
                {trigger}
                <button data-testid="confirm-delete" onClick={onConfirm}>
                    Confirm Delete
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
    ActionItem: ({ label, disabled, onClick }: any) => (
        <button disabled={disabled} onClick={onClick}>
            {label}
        </button>
    ),
}))

// Controlled mock for useCurrentAppointment so tests can set different states
let mockUseCurrentAppointment: () => { appointment: any; isLoading: boolean }

vi.mock('~/hooks/useCurrentAppointment', () => ({
    get useCurrentAppointment() {
        return () => mockUseCurrentAppointment()
    },
}))

import Session from '~/routes/psychologist/session'
import { toast } from 'sonner'

const upcomingAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    status: 'upcoming' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
}

const upcomingAppointmentNoMeet = {
    ...upcomingAppointment,
    googleMeetLink: null,
}

const pastAppointment = {
    ...upcomingAppointment,
    status: 'past' as const,
}

function renderSession(path = '/psycho/clients/client-456/appointments/apt-001') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId/appointments/:appointmentId"
                    element={<Session />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('upcoming appointment detail view', () => {
    beforeEach(() => {
        mockStart.mockReset()
        mockDelete.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('shows loading state while API is pending', () => {
        mockUseCurrentAppointment = () => ({ appointment: null, isLoading: true })

        renderSession()

        expect(screen.getByText(/loading appointment/i)).toBeInTheDocument()
    })

    it('shows not-found state when getById rejects', () => {
        mockUseCurrentAppointment = () => ({ appointment: null, isLoading: false })

        renderSession()

        expect(screen.getByText(/appointment not found/i)).toBeInTheDocument()
    })

    it('renders formatted date range after data loads', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })

        renderSession()

        // date-fns PPP format for 2026-04-01
        expect(screen.getByText(/april 1(st)?, 2026/i)).toBeInTheDocument()
        // HH:mm range — time depends on timezone, just check format pattern
        expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('renders Google Meet link when present', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })

        renderSession()

        expect(screen.getByText('https://meet.google.com/abc')).toBeInTheDocument()
    })

    it('renders "No Google Meet link" text when googleMeetLink is absent', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointmentNoMeet,
            isLoading: false,
        })

        renderSession()

        expect(screen.getByText(/no google meet link/i)).toBeInTheDocument()
    })

    it('"Start Appointment" button is rendered for upcoming status', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })

        renderSession()

        expect(screen.getByRole('button', { name: /start appointment/i })).toBeInTheDocument()
    })

    it('"Start Appointment" button is absent for past appointment', () => {
        mockUseCurrentAppointment = () => ({
            appointment: pastAppointment,
            isLoading: false,
        })

        renderSession()

        expect(screen.queryByRole('button', { name: /start appointment/i })).not.toBeInTheDocument()
    })

    it('calls appointmentService.start on Start button click', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        mockStart.mockResolvedValue({
            data: { appointment: { ...upcomingAppointment, status: 'active' } },
        })

        renderSession()

        const startBtn = screen.getByRole('button', { name: /start appointment/i })
        await act(async () => {
            startBtn.click()
        })

        await waitFor(() => {
            expect(mockStart).toHaveBeenCalledWith('client-456', 'apt-001')
        })
    })

    it('shows AnotherAppointmentActive inline warning with navigation link on that error', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        mockStart.mockRejectedValue({
            response: {
                data: {
                    error: 'AnotherAppointmentActive',
                    message: 'End your active appointment before starting a new one.',
                    activeAppointmentId: 'apt-999',
                },
            },
        })

        renderSession()

        const startBtn = screen.getByRole('button', { name: /start appointment/i })
        await act(async () => {
            startBtn.click()
        })

        await waitFor(() => {
            expect(
                screen.getByText(/end your active appointment before starting a new one/i),
            ).toBeInTheDocument()
            expect(
                screen.getByRole('button', { name: /go to active appointment/i }),
            ).toBeInTheDocument()
        })
    })

    it('shows toast.error on generic start failure', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        mockStart.mockRejectedValue(new Error('Network error'))

        renderSession()

        const startBtn = screen.getByRole('button', { name: /start appointment/i })
        await act(async () => {
            startBtn.click()
        })

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'Failed to start appointment. Please try again.',
            )
        })
    })

    it('renders Edit and Delete actions for upcoming appointment (psychologist role)', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })

        renderSession()

        expect(screen.getByRole('button', { name: /edit appointment/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /delete appointment/i })).toBeInTheDocument()
    })
})
