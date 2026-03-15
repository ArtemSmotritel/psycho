import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetchRecommendations = vi.fn()
const mockReply = vi.fn()
const mockGetList = vi.fn()

vi.mock('~/services/recommendation.service', () => ({
    recommendationService: {
        getList: (...args: any[]) => mockGetList(...args),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        reply: (...args: any[]) => mockReply(...args),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock ConfirmAction to bypass dialog
vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, onConfirm }: any) => (
        <div>
            {trigger}
            <button data-testid="confirm-action" onClick={onConfirm}>
                Confirm
            </button>
        </div>
    ),
}))

// Mock RecommendationForm to bypass dialog
vi.mock('~/components/RecommendationForm', () => ({
    RecommendationForm: ({ trigger }: any) => <div>{trigger}</div>,
}))

import { AppointmentRecommendationsPanel } from '~/components/AppointmentRecommendationsPanel'
import { toast } from 'sonner'

const sampleRecommendation = {
    id: 'rec-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-001',
    type: 'recommendation' as const,
    name: 'Do yoga',
    text: 'Practice daily.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    reaction: null,
}

describe('AppointmentRecommendationsPanel', () => {
    beforeEach(() => {
        mockGetList.mockReset()
        mockReply.mockReset()
        vi.mocked(toast.error).mockReset?.()
        vi.mocked(toast.success).mockReset?.()
    })

    it('calls recommendationService.reply on reply submit', async () => {
        const user = userEvent.setup()
        mockGetList.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockResolvedValue({ data: { reaction: { psychologistReply: 'Keep it up!' } } })

        render(<AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />)

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Keep it up!')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(mockReply).toHaveBeenCalledWith('client-001', 'apt-001', 'rec-001', {
                reply: 'Keep it up!',
            })
        })
    })

    it('calls getList again (fetchRecommendations) on successful reply', async () => {
        const user = userEvent.setup()
        mockGetList.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockResolvedValue({ data: { reaction: { psychologistReply: 'Keep it up!' } } })

        render(<AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />)

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const callsBefore = mockGetList.mock.calls.length
        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Great!')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(mockGetList.mock.calls.length).toBeGreaterThan(callsBefore)
        })
    })

    it('shows toast.error on reply failure', async () => {
        const user = userEvent.setup()
        mockGetList.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockRejectedValue(new Error('API error'))

        render(<AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />)

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Reply')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalled()
        })
    })
})
