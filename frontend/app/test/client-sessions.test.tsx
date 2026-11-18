import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockGetList = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getListForPsycho: (...args: any[]) => mockGetList(...args),
    },
}))

vi.mock('~/services/client.service', () => ({
    clientService: {
        getListForPsycho: vi.fn().mockResolvedValue({
            data: {
                clients: [
                    { id: 'client-123', name: 'Jane Doe' },
                    { id: 'client-456', name: 'John Roe' },
                ],
            },
        }),
        getByIdForPsycho: vi.fn().mockResolvedValue({
            data: { client: { id: 'client-123', name: 'Jane Doe' } },
        }),
    },
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

const makeAppointment = (overrides: Record<string, unknown> = {}) => ({
    id: 'apt-1',
    clientId: 'client-123',
    clientName: 'Jane Doe',
    psychoId: 'psycho-1',
    startTime: '2027-01-10T10:00:00.000Z',
    endTime: '2027-01-10T11:00:00.000Z',
    startedAt: null,
    endedAt: null,
    status: 'upcoming',
    googleMeetLink: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    notesCount: 0,
    impressionsCount: 0,
    recommendationsCount: 0,
    ...overrides,
})

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

    it('requests the appointments of the client from the route', async () => {
        mockGetList.mockResolvedValue({ data: { appointments: [] } })

        renderWithRouter('client-123')

        await waitFor(() => {
            expect(mockGetList).toHaveBeenCalledWith('client-123')
        })
    })

    it('renders one table row per appointment with client name, status and counts', async () => {
        mockGetList.mockResolvedValue({
            data: {
                appointments: [
                    makeAppointment({ id: 'apt-1', status: 'upcoming', notesCount: 7 }),
                    makeAppointment({
                        id: 'apt-2',
                        status: 'missed',
                        startTime: '2025-01-10T10:00:00.000Z',
                        endTime: '2025-01-10T11:00:00.000Z',
                        recommendationsCount: 5,
                    }),
                ],
            },
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getAllByText('Jane Doe')).toHaveLength(2)
        })
        expect(screen.getByText('upcoming')).toBeInTheDocument()
        expect(screen.getByText('missed')).toBeInTheDocument()
        expect(screen.getByText('7')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('shows an empty message when the client has no appointments', async () => {
        mockGetList.mockResolvedValue({ data: { appointments: [] } })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no appointments found/i)).toBeInTheDocument()
        })
    })

    it('shows error state on API failure', async () => {
        mockGetList.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })

    it('opens the schedule form with the client pre-selected and locked', async () => {
        mockGetList.mockResolvedValue({ data: { appointments: [] } })

        renderWithRouter()

        const scheduleButton = await screen.findByRole('button', {
            name: /schedule appointment/i,
        })
        fireEvent.click(scheduleButton)

        const combobox = await screen.findByRole('combobox')
        await waitFor(() => {
            expect(combobox).toHaveTextContent('Jane Doe')
        })
        expect(combobox).toBeDisabled()
    })
})
