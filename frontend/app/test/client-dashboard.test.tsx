import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockGetClientDashboard = vi.fn()

vi.mock('~/services/dashboard.service', () => ({
    dashboardService: {
        getDashboardForClient: (...args: any[]) => mockGetClientDashboard(...args),
    },
}))

import ClientDashboard from '~/routes/client/dashboard'
import type { ClientDashboardData } from '~/models/dashboard'

function makeData(overrides: Partial<ClientDashboardData> = {}): ClientDashboardData {
    return {
        psychologists: [],
        activeAppointment: null,
        nextAppointment: null,
        pendingRecommendations: [],
        appointmentCounts: { upcoming: 0, active: 0, past: 0 },
        ...overrides,
    }
}

function renderWithRouter() {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={['/client/dashboard']}>
                <Routes>
                    <Route path="/client/dashboard" element={<ClientDashboard />} />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('ClientDashboard route', () => {
    beforeEach(() => {
        mockGetClientDashboard.mockReset()
    })

    it('renders loading state while fetch is in progress', () => {
        let resolve!: (val: any) => void
        mockGetClientDashboard.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        renderWithRouter()

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        resolve({ data: makeData() })
    })

    it('renders error message when API call fails', async () => {
        mockGetClientDashboard.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })

    it('renders "No upcoming appointments" when nextAppointment is null', async () => {
        mockGetClientDashboard.mockResolvedValue({ data: makeData({ nextAppointment: null }) })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument()
        })
    })

    it('renders next appointment card with date and psychologist name when appointment exists', async () => {
        mockGetClientDashboard.mockResolvedValue({
            data: makeData({
                nextAppointment: {
                    id: 'apt-001',
                    clientId: 'client-001',
                    psychoId: 'psycho-001',
                    startTime: '2030-04-01T10:00:00.000Z',
                    endTime: '2030-04-01T11:00:00.000Z',
                    startedAt: null,
                    endedAt: null,
                    status: 'upcoming',
                    googleMeetLink: null,
                    whiteboardSnapshotUrl: null,
                    createdAt: '2030-01-01T00:00:00.000Z',
                    psychoName: 'Dr. Smith',
                },
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Dr. Smith')).toBeInTheDocument()
        })
    })

    it('renders Active Appointment card with Join now link when activeAppointment is present', async () => {
        mockGetClientDashboard.mockResolvedValue({
            data: makeData({
                activeAppointment: {
                    id: 'apt-active',
                    clientId: 'client-001',
                    psychoId: 'psycho-001',
                    startTime: '2030-04-01T10:00:00.000Z',
                    endTime: '2030-04-01T11:00:00.000Z',
                    startedAt: '2030-04-01T10:00:00.000Z',
                    endedAt: null,
                    status: 'active',
                    googleMeetLink: null,
                    whiteboardSnapshotUrl: null,
                    createdAt: '2030-01-01T00:00:00.000Z',
                    psychoName: 'Dr. Active',
                },
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/active appointment/i)).toBeInTheDocument()
        })
        expect(screen.getByText('Dr. Active')).toBeInTheDocument()
        const joinLink = screen.getByRole('link', { name: /join now/i })
        expect(joinLink).toHaveAttribute('href', '/client/appointments/apt-active/live')
    })

    it('does not render Active Appointment banner when activeAppointment is null', async () => {
        mockGetClientDashboard.mockResolvedValue({ data: makeData({ activeAppointment: null }) })

        renderWithRouter()

        await waitFor(() => {
            expect(mockGetClientDashboard).toHaveBeenCalled()
        })
        expect(screen.queryByText(/active appointment/i)).not.toBeInTheDocument()
        expect(screen.queryByRole('link', { name: /join now/i })).not.toBeInTheDocument()
    })

    it('renders "No pending recommendations" when array is empty', async () => {
        mockGetClientDashboard.mockResolvedValue({
            data: makeData({ pendingRecommendations: [] }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no pending recommendations/i)).toBeInTheDocument()
        })
    })

    it('calls dashboardService.getClientDashboard on mount', async () => {
        mockGetClientDashboard.mockResolvedValue({ data: makeData() })

        renderWithRouter()

        await waitFor(() => {
            expect(mockGetClientDashboard).toHaveBeenCalledTimes(1)
        })
    })
})
