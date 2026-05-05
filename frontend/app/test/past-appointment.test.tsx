import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockListForPsycho = vi.fn()

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForPsycho: (...args: any[]) => mockListForPsycho(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

vi.mock('~/components/AppointmentNotesPanel', () => ({
    AppointmentNotesPanel: () => <div data-testid="notes-panel" />,
}))

vi.mock('~/components/AppointmentRecommendationsPanel', () => ({
    AppointmentRecommendationsPanel: () => <div data-testid="recommendations-panel" />,
}))

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        startForPsycho: vi.fn(),
        updateForPsycho: vi.fn(),
        deleteForPsycho: vi.fn(),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger }: any) => <div>{trigger}</div>,
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

const baseAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: '2026-04-01T11:00:00.000Z',
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
    whiteboardSnapshotUrl: null as string | null,
}

const pastAppointment = {
    ...baseAppointment,
    status: 'past' as const,
}

const missedAppointment = {
    ...baseAppointment,
    status: 'missed' as const,
}

const upcomingAppointment = {
    ...baseAppointment,
    startedAt: null,
    endedAt: null,
    status: 'upcoming' as const,
}

const sampleImpression = {
    id: 'imp-001',
    appointmentId: 'apt-001',
    authorId: 'client-456',
    type: 'impression' as const,
    name: null,
    text: 'Felt much better today.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:30:00.000Z',
    updatedAt: '2026-04-01T10:30:00.000Z',
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

describe('past appointment detail view', () => {
    beforeEach(() => {
        mockListForPsycho.mockReset()
    })

    it('renders date and time range heading for a past appointment', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByText(/april 1(st)?, 2026/i)).toBeInTheDocument()
        })
        expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('renders the AppointmentNotesPanel component', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByTestId('notes-panel')).toBeInTheDocument()
        })
    })

    it('renders the AppointmentRecommendationsPanel component', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByTestId('recommendations-panel')).toBeInTheDocument()
        })
    })

    it('calls attachmentService.listForPsycho with correct clientId, appointmentId, and impression filter on mount for past status', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(mockListForPsycho).toHaveBeenCalledWith('client-456', 'apt-001', 'impression')
        })
    })

    it('renders impression text returned by attachmentService.listForPsycho', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [sampleImpression] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByText('Felt much better today.')).toBeInTheDocument()
        })
    })

    it('shows loading spinner (via ImpressionList) while impression fetch is in progress', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        // never resolves during the test
        mockListForPsycho.mockReturnValue(new Promise(() => {}))

        renderSession()

        await waitFor(() => {
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
        })
    })

    it('shows "No impressions yet." when listForPsycho returns an empty array', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByText(/no impressions yet/i)).toBeInTheDocument()
        })
    })

    it('renders whiteboard snapshot <img> element when whiteboardSnapshotUrl is non-null', async () => {
        const appointmentWithSnapshot = {
            ...pastAppointment,
            whiteboardSnapshotUrl: 'https://example.com/snapshot.png',
        }
        mockUseCurrentAppointment = () => ({
            appointment: appointmentWithSnapshot,
            isLoading: false,
        })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            const img = screen.getByRole('img')
            expect(img).toBeInTheDocument()
            expect(img).toHaveAttribute('src', 'https://example.com/snapshot.png')
        })
    })

    it('does not render whiteboard snapshot section when whiteboardSnapshotUrl is null', async () => {
        mockUseCurrentAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.queryByRole('img')).not.toBeInTheDocument()
        })
    })

    it('does not call attachmentService.listForPsycho when appointment status is upcoming', () => {
        mockUseCurrentAppointment = () => ({ appointment: upcomingAppointment, isLoading: false })

        renderSession()

        expect(mockListForPsycho).not.toHaveBeenCalled()
    })

    it('renders missed status through the same past branch (no "Start Appointment" button)', async () => {
        mockUseCurrentAppointment = () => ({ appointment: missedAppointment, isLoading: false })
        mockListForPsycho.mockResolvedValue({ data: { impressions: [] } })

        renderSession()

        await waitFor(() => {
            expect(screen.getByTestId('notes-panel')).toBeInTheDocument()
        })
        expect(screen.queryByRole('button', { name: /start appointment/i })).not.toBeInTheDocument()
    })
})
