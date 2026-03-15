import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockReact = vi.fn()
const mockGetClientList = vi.fn()
const mockImpressionGetClientList = vi.fn()

vi.mock('~/services/recommendation.service', () => ({
    recommendationService: {
        getClientList: (...args: any[]) => mockGetClientList(...args),
        react: (...args: any[]) => mockReact(...args),
    },
}))

vi.mock('~/services/impression.service', () => ({
    impressionService: {
        getClientList: (...args: any[]) => mockImpressionGetClientList(...args),
        submit: vi.fn(),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'client' }),
}))

let mockUseCurrentClientAppointment: () => { appointment: any; isLoading: boolean }

vi.mock('~/hooks/useCurrentClientAppointment', () => ({
    get useCurrentClientAppointment() {
        return () => mockUseCurrentClientAppointment()
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

import ClientAppointmentDetail from '~/routes/client/appointment-detail'
import { toast } from 'sonner'

const pastAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: '2026-04-01T11:00:00.000Z',
    status: 'past' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
    psychoName: 'Dr. Smith',
}

const sampleRecommendation = {
    id: 'rec-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-123',
    type: 'recommendation' as const,
    name: 'Do yoga',
    text: 'Practice daily.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    reaction: null,
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

describe('ClientAppointmentDetail — past appointment with recommendations', () => {
    beforeEach(() => {
        mockReact.mockReset()
        mockGetClientList.mockReset()
        mockImpressionGetClientList.mockReset()
        vi.mocked(toast.error).mockReset?.()
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointment,
            isLoading: false,
        })
        mockImpressionGetClientList.mockResolvedValue({ data: { impressions: [] } })
    })

    it('calls recommendationService.react on done toggle', async () => {
        const user = userEvent.setup()
        mockGetClientList
            .mockResolvedValueOnce({ data: { recommendations: [sampleRecommendation] } })
            .mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReact.mockResolvedValue({ data: { reaction: {} } })

        renderDetail()

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('checkbox'))

        await waitFor(() => {
            expect(mockReact).toHaveBeenCalledWith('apt-001', 'rec-001', { done: true })
        })
    })

    it('calls recommendationService.react on comment submit', async () => {
        const user = userEvent.setup()
        // First call: initial load; second call: re-fetch after react
        mockGetClientList
            .mockResolvedValueOnce({ data: { recommendations: [sampleRecommendation] } })
            .mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReact.mockResolvedValue({ data: { reaction: {} } })

        renderDetail()

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        // Multiple textareas: impression form + recommendation comment textarea
        // Find the one with "Leave a comment..." placeholder
        const commentTextarea = screen.getByPlaceholderText('Leave a comment...')
        await user.type(commentTextarea, 'My comment')
        // The impression form submit is the "type=submit" button; the recommendation card
        // uses an onClick button. Use aria-label or test by proximity — click the submit
        // that is closest to (directly after) the comment textarea.
        // Since both are type button, find by finding all Submit buttons and clicking the
        // second one (first one belongs to impression form which has type="submit" attr)
        const submitButtons = screen.getAllByRole('button', { name: /submit/i })
        // impression form button is type=submit, recommendation card button is type=button
        const reactionSubmit = submitButtons.find(
            (btn) => btn.getAttribute('type') !== 'submit' && !btn.hasAttribute('disabled'),
        )
        await user.click(reactionSubmit!)

        await waitFor(() => {
            expect(mockReact).toHaveBeenCalledWith('apt-001', 'rec-001', {
                comment: 'My comment',
            })
        })
    })

    it('shows toast.error when react fails', async () => {
        const user = userEvent.setup()
        mockGetClientList.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReact.mockRejectedValue(new Error('API error'))

        renderDetail()

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('checkbox'))

        await waitFor(
            () => {
                expect(vi.mocked(toast.error)).toHaveBeenCalled()
            },
            { timeout: 3000 },
        )
    })
})
