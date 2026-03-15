import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockGetPsychoProgressList = vi.fn()

vi.mock('~/services/impression.service', () => ({
    impressionService: {
        getPsychoProgressList: (...args: any[]) => mockGetPsychoProgressList(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

import ClientProgress from '~/routes/psychologist/client-progress'
import type { AttachmentWithAppointment } from '~/models/attachment'

function makeImpression(
    overrides: Partial<AttachmentWithAppointment> = {},
): AttachmentWithAppointment {
    return {
        id: 'imp-001',
        appointmentId: 'apt-001',
        authorId: 'user-001',
        type: 'impression',
        name: null,
        text: 'Sample impression text',
        imageFiles: [],
        audioFiles: [],
        createdAt: '2026-04-01T10:30:00.000Z',
        updatedAt: '2026-04-01T10:30:00.000Z',
        appointmentStartTime: '2026-04-01T10:00:00.000Z',
        ...overrides,
    }
}

function renderWithRouter(clientId = 'client-123') {
    return render(
        <MemoryRouter initialEntries={[`/psycho/clients/${clientId}/progress`]}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId/progress"
                    element={<ClientProgress params={{ clientId }} />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('ClientProgress route', () => {
    beforeEach(() => {
        mockGetPsychoProgressList.mockReset()
    })

    it('shows loading state while fetch is pending', () => {
        let resolve!: (val: any) => void
        mockGetPsychoProgressList.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        renderWithRouter()

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        resolve({ data: { impressions: [] } })
    })

    it('shows error message when service rejects', async () => {
        mockGetPsychoProgressList.mockRejectedValue(new Error('Network error'))

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
        })
    })

    it('shows EmptyMessage when fetch resolves with empty array', async () => {
        mockGetPsychoProgressList.mockResolvedValue({ data: { impressions: [] } })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText(/no impressions yet/i)).toBeInTheDocument()
        })
    })

    it('renders appointment group headers and impression text when data is present', async () => {
        mockGetPsychoProgressList.mockResolvedValue({
            data: {
                impressions: [
                    makeImpression({
                        id: 'imp-1',
                        appointmentId: 'apt-1',
                        appointmentStartTime: '2026-04-01T10:00:00.000Z',
                        text: 'Impression from apt 1',
                    }),
                    makeImpression({
                        id: 'imp-2',
                        appointmentId: 'apt-2',
                        appointmentStartTime: '2026-04-08T10:00:00.000Z',
                        text: 'Impression from apt 2',
                    }),
                ],
            },
        })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Impression from apt 1')).toBeInTheDocument()
            expect(screen.getByText('Impression from apt 2')).toBeInTheDocument()
        })
    })

    it('paginates over appointment groups — shows at most 3 per page', async () => {
        const impressions = [
            makeImpression({
                id: 'imp-1',
                appointmentId: 'apt-1',
                appointmentStartTime: '2026-04-01T10:00:00.000Z',
                text: 'Apt 1 impression',
            }),
            makeImpression({
                id: 'imp-2',
                appointmentId: 'apt-2',
                appointmentStartTime: '2026-04-08T10:00:00.000Z',
                text: 'Apt 2 impression',
            }),
            makeImpression({
                id: 'imp-3',
                appointmentId: 'apt-3',
                appointmentStartTime: '2026-04-15T10:00:00.000Z',
                text: 'Apt 3 impression',
            }),
            makeImpression({
                id: 'imp-4',
                appointmentId: 'apt-4',
                appointmentStartTime: '2026-04-22T10:00:00.000Z',
                text: 'Apt 4 impression',
            }),
        ]
        mockGetPsychoProgressList.mockResolvedValue({ data: { impressions } })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Apt 1 impression')).toBeInTheDocument()
            expect(screen.getByText('Apt 2 impression')).toBeInTheDocument()
            expect(screen.getByText('Apt 3 impression')).toBeInTheDocument()
            expect(screen.queryByText('Apt 4 impression')).not.toBeInTheDocument()
        })
    })

    it('next button advances page to show 4th appointment group', async () => {
        const user = userEvent.setup()
        const impressions = [
            makeImpression({
                id: 'imp-1',
                appointmentId: 'apt-1',
                appointmentStartTime: '2026-04-01T10:00:00.000Z',
                text: 'Apt 1 impression',
            }),
            makeImpression({
                id: 'imp-2',
                appointmentId: 'apt-2',
                appointmentStartTime: '2026-04-08T10:00:00.000Z',
                text: 'Apt 2 impression',
            }),
            makeImpression({
                id: 'imp-3',
                appointmentId: 'apt-3',
                appointmentStartTime: '2026-04-15T10:00:00.000Z',
                text: 'Apt 3 impression',
            }),
            makeImpression({
                id: 'imp-4',
                appointmentId: 'apt-4',
                appointmentStartTime: '2026-04-22T10:00:00.000Z',
                text: 'Apt 4 impression',
            }),
        ]
        mockGetPsychoProgressList.mockResolvedValue({ data: { impressions } })

        renderWithRouter()

        await waitFor(() => {
            expect(screen.getByText('Apt 1 impression')).toBeInTheDocument()
        })

        // click the next button (ChevronRight)
        const buttons = screen.getAllByRole('button')
        const nextButton = buttons[buttons.length - 1]
        await user.click(nextButton)

        await waitFor(() => {
            expect(screen.getByText('Apt 4 impression')).toBeInTheDocument()
            expect(screen.queryByText('Apt 1 impression')).not.toBeInTheDocument()
        })
    })

    it('sort toggle re-orders appointment groups and resets to page 0', async () => {
        const user = userEvent.setup()
        const impressions = [
            makeImpression({
                id: 'imp-1',
                appointmentId: 'apt-1',
                appointmentStartTime: '2026-04-01T10:00:00.000Z',
                text: 'First appointment',
            }),
            makeImpression({
                id: 'imp-2',
                appointmentId: 'apt-2',
                appointmentStartTime: '2026-04-08T10:00:00.000Z',
                text: 'Second appointment',
            }),
            makeImpression({
                id: 'imp-3',
                appointmentId: 'apt-3',
                appointmentStartTime: '2026-04-15T10:00:00.000Z',
                text: 'Third appointment',
            }),
            makeImpression({
                id: 'imp-4',
                appointmentId: 'apt-4',
                appointmentStartTime: '2026-04-22T10:00:00.000Z',
                text: 'Fourth appointment',
            }),
        ]
        mockGetPsychoProgressList.mockResolvedValue({ data: { impressions } })

        renderWithRouter()

        // Wait for data to load (oldest first by default)
        await waitFor(() => {
            expect(screen.getByText('First appointment')).toBeInTheDocument()
        })

        // Switch to Newest First
        const switchEl = screen.getByRole('switch')
        await user.click(switchEl)

        await waitFor(() => {
            // After toggling, should show newest first: 4th appointment on page 0
            expect(screen.getByText('Fourth appointment')).toBeInTheDocument()
            expect(screen.queryByText('First appointment')).not.toBeInTheDocument()
        })
    })

    it('appointment group header links to correct appointments path', async () => {
        mockGetPsychoProgressList.mockResolvedValue({
            data: {
                impressions: [
                    makeImpression({
                        id: 'imp-1',
                        appointmentId: 'apt-999',
                        appointmentStartTime: '2026-04-01T10:00:00.000Z',
                        text: 'Some impression',
                    }),
                ],
            },
        })

        renderWithRouter('client-123')

        await waitFor(() => {
            const link = screen.getByRole('link')
            expect(link).toHaveAttribute('href', '/psycho/clients/client-123/appointments/apt-999')
        })
    })
})
