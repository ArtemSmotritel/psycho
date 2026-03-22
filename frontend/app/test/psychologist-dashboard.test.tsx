import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockGetPsychoDashboard = vi.fn()

vi.mock('~/services/dashboard.service', () => ({
    dashboardService: {
        getPsychoDashboard: (...args: any[]) => mockGetPsychoDashboard(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

import DashboardOverview from '~/routes/psychologist/dashboard.index'
import type { PsychoDashboard } from '~/models/dashboard'

function makeData(overrides: Partial<PsychoDashboard> = {}): PsychoDashboard {
    return {
        totalClients: 0,
        totalUpcomingAppointments: 0,
        totalPastAppointments: 0,
        activeAppointment: null,
        upcomingAppointments: [],
        recentClients: [],
        ...overrides,
    }
}

function renderWithRouter() {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={['/psycho']}>
                <Routes>
                    <Route path="/psycho" element={<DashboardOverview />} />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('DashboardOverview route', () => {
    beforeEach(() => {
        mockGetPsychoDashboard.mockReset()
    })

    it('shows loading state while getPsychoDashboard is pending', () => {
        let resolve!: (val: any) => void
        mockGetPsychoDashboard.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        renderWithRouter()

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        resolve({ data: makeData() })
    })

    it('shows an error message when getPsychoDashboard rejects', async () => {
        mockGetPsychoDashboard.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })

    it('renders stat cards with correct counts after successful fetch', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({
                totalClients: 7,
                totalUpcomingAppointments: 3,
                totalPastAppointments: 12,
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('7')).toBeInTheDocument()
            expect(screen.getByText('3')).toBeInTheDocument()
            expect(screen.getByText('12')).toBeInTheDocument()
        })
    })

    it('renders active appointment banner with client name and live link when activeAppointment is non-null', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({
                activeAppointment: {
                    id: 'apt-active-001',
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
                    clientName: 'Alice Smith',
                    notesCount: 0,
                    impressionsCount: 0,
                    recommendationsCount: 0,
                },
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Alice Smith')).toBeInTheDocument()
            const liveLink = screen.getByRole('link', { name: /go to appointment/i })
            expect(liveLink).toBeInTheDocument()
            expect(liveLink).toHaveAttribute(
                'href',
                '/psycho/clients/client-001/appointments/apt-active-001/live',
            )
        })
    })

    it('does not render active appointment banner when activeAppointment is null', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({ activeAppointment: null }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.queryByText(/go to appointment/i)).not.toBeInTheDocument()
        })
    })

    it('renders upcoming appointment list items with client name and formatted date', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({
                upcomingAppointments: [
                    {
                        id: 'apt-upcoming-001',
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
                        clientName: 'Bob Jones',
                        notesCount: 0,
                        impressionsCount: 0,
                        recommendationsCount: 0,
                    },
                ],
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Bob Jones')).toBeInTheDocument()
            // The date Apr 1 2030 should appear in some formatted form
            expect(screen.getByText(/Apr/i)).toBeInTheDocument()
        })
    })

    it('renders "No upcoming appointments." empty state when upcomingAppointments is empty', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({ upcomingAppointments: [] }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument()
        })
    })

    it('renders recent clients list with client names', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({
                recentClients: [
                    {
                        id: 'client-001',
                        name: 'Carol White',
                        email: 'carol@example.com',
                        image: null,
                        username: null,
                        phone: null,
                        telegram: null,
                        instagram: null,
                        registrationDate: '2030-01-01T00:00:00.000Z',
                        sessionsCount: 0,
                        impressionsCount: 0,
                        recommendationsCount: 0,
                        lastAppointment: null,
                        nextAppointment: null,
                    },
                    {
                        id: 'client-002',
                        name: 'Dan Brown',
                        email: 'dan@example.com',
                        image: null,
                        username: null,
                        phone: null,
                        telegram: null,
                        instagram: null,
                        registrationDate: '2030-01-01T00:00:00.000Z',
                        sessionsCount: 0,
                        impressionsCount: 0,
                        recommendationsCount: 0,
                        lastAppointment: null,
                        nextAppointment: null,
                    },
                ],
            }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Carol White')).toBeInTheDocument()
            expect(screen.getByText('Dan Brown')).toBeInTheDocument()
        })
    })

    it('renders "No clients yet." empty state when recentClients is empty', async () => {
        mockGetPsychoDashboard.mockResolvedValue({
            data: makeData({ recentClients: [] }),
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no clients yet/i)).toBeInTheDocument()
        })
    })
})
