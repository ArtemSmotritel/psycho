import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

const mockReply = vi.fn()
const mockListForPsycho = vi.fn()

vi.mock('~/services/recommendation.service', () => ({
    recommendationService: {
        replyForPsycho: (...args: any[]) => mockReply(...args),
    },
}))

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForPsycho: (...args: any[]) => mockListForPsycho(...args),
        createForPsycho: vi.fn(),
        deleteForPsycho: vi.fn(),
        updateForPsycho: vi.fn(),
    },
    getDeleteAttachmentErrorMessage: () => 'Failed to delete attachment.',
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock ConfirmAction to bypass the Radix dialog. Each instance exposes a
// distinct testid keyed on title so different confirmations (delete vs reply)
// can be targeted independently.
vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, title, description, onConfirm }: any) => (
        <div>
            {trigger}
            <div>{title}</div>
            <div>{description}</div>
            <button data-testid={`confirm-${title}`} onClick={onConfirm}>
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
        mockListForPsycho.mockReset()
        mockReply.mockReset()
        vi.mocked(toast.error).mockReset?.()
        vi.mocked(toast.success).mockReset?.()
    })

    it('calls recommendationService.reply on reply submit', async () => {
        const user = userEvent.setup()
        mockListForPsycho.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockResolvedValue({ data: { reaction: { psychologistReply: 'Keep it up!' } } })

        render(
            <MemoryRouter>
                <AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Keep it up!')
        await user.click(screen.getByTestId('confirm-Send reply?'))

        await waitFor(() => {
            expect(mockReply).toHaveBeenCalledWith('client-001', 'apt-001', 'rec-001', {
                reply: 'Keep it up!',
            })
        })
    })

    it('calls listForPsycho again (fetchRecommendations) on successful reply', async () => {
        const user = userEvent.setup()
        mockListForPsycho.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockResolvedValue({ data: { reaction: { psychologistReply: 'Keep it up!' } } })

        render(
            <MemoryRouter>
                <AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const callsBefore = mockListForPsycho.mock.calls.length
        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Great!')
        await user.click(screen.getByTestId('confirm-Send reply?'))

        await waitFor(() => {
            expect(mockListForPsycho.mock.calls.length).toBeGreaterThan(callsBefore)
        })
    })

    it('shows toast.error on reply failure', async () => {
        const user = userEvent.setup()
        mockListForPsycho.mockResolvedValue({ data: { recommendations: [sampleRecommendation] } })
        mockReply.mockRejectedValue(new Error('API error'))

        render(
            <MemoryRouter>
                <AppointmentRecommendationsPanel clientId="client-001" appointmentId="apt-001" />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })

        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Reply')
        await user.click(screen.getByTestId('confirm-Send reply?'))

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalled()
        })
    })
})
