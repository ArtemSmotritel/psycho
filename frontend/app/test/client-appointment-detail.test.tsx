import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'client' }),
}))

vi.mock('~/services/recommendation.service', () => ({
    recommendationService: {
        reactForClient: vi.fn(),
    },
}))

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForClient: vi
            .fn()
            .mockResolvedValue({ data: { impressions: [], recommendations: [] } }),
        createForClient: vi.fn(),
    },
}))

// Controlled mock for useCurrentClientAppointment so tests can set different states
let mockUseCurrentClientAppointment: () => { appointment: any; isLoading: boolean }

vi.mock('~/hooks/useCurrentClientAppointment', () => ({
    get useCurrentClientAppointment() {
        return () => mockUseCurrentClientAppointment()
    },
}))

import ClientAppointmentDetail from '~/routes/client/appointment-detail'

const upcomingAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: null,
    endedAt: null,
    status: 'upcoming' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
    psychoName: 'Dr. Smith',
}

const upcomingNoMeet = {
    ...upcomingAppointment,
    googleMeetLink: null,
}

const pastAppointment = {
    ...upcomingAppointment,
    status: 'past' as const,
    whiteboardSnapshotUrl: null,
}

const pastAppointmentWithSnapshot = {
    ...pastAppointment,
    whiteboardSnapshotUrl: 'https://example.com/snapshot.png',
}

const pastAppointmentNoSnapshot = {
    ...pastAppointment,
    whiteboardSnapshotUrl: null,
}

const missedAppointment = {
    ...upcomingAppointment,
    status: 'missed' as const,
}

const activeAppointment = {
    ...upcomingAppointment,
    status: 'active' as const,
}

const activeNoMeet = {
    ...upcomingAppointment,
    status: 'active' as const,
    googleMeetLink: null,
}

function renderDetail(path = '/client/appointments/apt-001') {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route
                        path="/client/appointments/:appointmentId"
                        element={<ClientAppointmentDetail />}
                    />
                    <Route path="*" element={<div data-testid="redirected" />} />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('ClientAppointmentDetail route', () => {
    it('shows loading state while data is pending', () => {
        mockUseCurrentClientAppointment = () => ({ appointment: null, isLoading: true })
        renderDetail()
        expect(screen.getByText(/loading appointment/i)).toBeInTheDocument()
    })

    it('shows not-found state when appointment is null and not loading', () => {
        mockUseCurrentClientAppointment = () => ({ appointment: null, isLoading: false })
        renderDetail()
        expect(screen.getByText(/appointment not found/i)).toBeInTheDocument()
    })

    it('renders past appointment detail view with impressions section', async () => {
        mockUseCurrentClientAppointment = () => ({ appointment: pastAppointment, isLoading: false })
        renderDetail()
        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })
    })

    it('renders missed appointment detail view with impressions section', async () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: missedAppointment,
            isLoading: false,
        })
        renderDetail()
        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })
    })

    it('redirects to live page when appointment is active', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByTestId('redirected')).toBeInTheDocument()
    })

    it('redirects to live page when active appointment has a google meet link', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByTestId('redirected')).toBeInTheDocument()
    })

    it('redirects to live page when active appointment has no google meet link', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: activeNoMeet,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByTestId('redirected')).toBeInTheDocument()
    })

    it('renders formatted date for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText(/april 1(st)?, 2026/i)).toBeInTheDocument()
    })

    it('renders time range for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument()
    })

    it('renders psychologist name for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
    })

    it('renders Google Meet link when present for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText('https://meet.google.com/abc')).toBeInTheDocument()
    })

    it('renders "No Google Meet link" text when googleMeetLink is null for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingNoMeet,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText(/no google meet link/i)).toBeInTheDocument()
    })

    it('shows Join Call action when googleMeetLink is present for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })
        renderDetail()
        expect(screen.getByText(/join call/i)).toBeInTheDocument()
    })

    it('does not show Join Call action when googleMeetLink is null for upcoming appointment', () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: upcomingNoMeet,
            isLoading: false,
        })
        renderDetail()
        expect(screen.queryByText(/join call/i)).not.toBeInTheDocument()
    })

    it('renders whiteboard snapshot image when whiteboardSnapshotUrl is present', async () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointmentWithSnapshot,
            isLoading: false,
        })
        renderDetail()
        await waitFor(() => {
            expect(screen.getByRole('img', { name: /whiteboard snapshot/i })).toBeInTheDocument()
        })
    })

    it('renders "No whiteboard snapshot available." text when whiteboardSnapshotUrl is null', async () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointmentNoSnapshot,
            isLoading: false,
        })
        renderDetail()
        await waitFor(() => {
            expect(screen.getByText(/no whiteboard snapshot available/i)).toBeInTheDocument()
        })
    })
})
