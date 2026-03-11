import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockGetClientGlobalList = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getClientGlobalList: (...args: any[]) => mockGetClientGlobalList(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'client' }),
}))

import ClientAppointments from '~/routes/client/appointments'

function renderWithRouter() {
    return render(
        <MemoryRouter initialEntries={['/client/appointments']}>
            <Routes>
                <Route path="/client/appointments" element={<ClientAppointments />} />
            </Routes>
        </MemoryRouter>,
    )
}

describe('ClientAppointments route', () => {
    beforeEach(() => {
        mockGetClientGlobalList.mockReset()
    })

    it('shows loading state before API resolves', () => {
        let resolve!: (val: any) => void
        mockGetClientGlobalList.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        renderWithRouter()

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        resolve({ data: { appointments: [] } })
    })

    it('shows Past Appointments and Upcoming Appointments section labels', async () => {
        mockGetClientGlobalList.mockResolvedValue({
            data: { appointments: [] },
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/past appointments/i)).toBeInTheDocument()
            expect(screen.getByText(/upcoming appointments/i)).toBeInTheDocument()
        })
    })

    it('renders appointment cards with psychoName in the correct section', async () => {
        const appointments = [
            {
                id: 'apt-1',
                clientId: 'client-456',
                psychoId: 'psycho-123',
                startTime: '2025-01-10T10:00:00.000Z',
                endTime: '2025-01-10T11:00:00.000Z',
                status: 'past',
                googleMeetLink: null,
                createdAt: '2025-01-01T00:00:00.000Z',
                psychoName: 'Dr. Smith',
            },
            {
                id: 'apt-2',
                clientId: 'client-456',
                psychoId: 'psycho-123',
                startTime: '2027-06-10T10:00:00.000Z',
                endTime: '2027-06-10T11:00:00.000Z',
                status: 'upcoming',
                googleMeetLink: null,
                createdAt: '2025-01-01T00:00:00.000Z',
                psychoName: 'Dr. Smith',
            },
        ]

        mockGetClientGlobalList.mockResolvedValue({
            data: { appointments },
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/past appointments/i)).toBeInTheDocument()
            expect(screen.getByText(/upcoming appointments/i)).toBeInTheDocument()
            // psychoName appears in appointment cards
            const psychoNames = screen.getAllByText('Dr. Smith')
            expect(psychoNames.length).toBeGreaterThanOrEqual(2)
        })
    })

    it('shows error state on API failure', async () => {
        mockGetClientGlobalList.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })

    it('shows empty state messages when each list is empty', async () => {
        mockGetClientGlobalList.mockResolvedValue({
            data: { appointments: [] },
        })

        renderWithRouter()

        await waitFor(() => {
            const emptyMessages = screen.getAllByText(/no appointments/i)
            expect(emptyMessages.length).toBeGreaterThanOrEqual(1)
        })
    })
})
