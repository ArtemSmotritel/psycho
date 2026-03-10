import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockGetList = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getList: (...args: any[]) => mockGetList(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

import ClientSessions from '~/routes/psychologist/client-sessions'

function renderWithRouter(clientId = 'client-123') {
    return render(
        <MemoryRouter initialEntries={[`/psycho/clients/${clientId}/appointments`]}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId/appointments"
                    element={<ClientSessions params={{ clientId }} />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('ClientSessions route', () => {
    beforeEach(() => {
        mockGetList.mockReset()
    })

    it('shows loading state before data arrives', () => {
        let resolve!: (val: any) => void
        mockGetList.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        renderWithRouter()

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        resolve({ data: { appointments: [] } })
    })

    it('shows Past Appointments and Upcoming Appointments section labels', async () => {
        mockGetList.mockResolvedValue({
            data: { appointments: [] },
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/past appointments/i)).toBeInTheDocument()
            expect(screen.getByText(/upcoming appointments/i)).toBeInTheDocument()
        })
    })

    it('renders appointment cards for returned appointments', async () => {
        mockGetList.mockResolvedValue({
            data: {
                appointments: [
                    {
                        id: 'apt-1',
                        clientId: 'client-123',
                        psychoId: 'psycho-1',
                        startTime: '2025-01-10T10:00:00.000Z',
                        endTime: '2025-01-10T11:00:00.000Z',
                        status: 'past',
                        googleMeetLink: null,
                        createdAt: '2025-01-01T00:00:00.000Z',
                    },
                    {
                        id: 'apt-2',
                        clientId: 'client-123',
                        psychoId: 'psycho-1',
                        startTime: '2027-01-10T10:00:00.000Z',
                        endTime: '2027-01-10T11:00:00.000Z',
                        status: 'upcoming',
                        googleMeetLink: null,
                        createdAt: '2025-01-01T00:00:00.000Z',
                    },
                ],
            },
        })

        renderWithRouter()

        await waitFor(() => {
            // Both section labels should be present
            expect(screen.getByText(/past appointments/i)).toBeInTheDocument()
            expect(screen.getByText(/upcoming appointments/i)).toBeInTheDocument()
        })
    })

    it('shows error state on API failure', async () => {
        mockGetList.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })
})
