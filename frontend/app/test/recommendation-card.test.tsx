import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

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

import { RecommendationCard } from '~/components/RecommendationCard'
import type { AttachmentWithReaction } from '~/models/attachment'

function makeRecommendation(
    overrides: Partial<AttachmentWithReaction> = {},
): AttachmentWithReaction {
    return {
        id: 'rec-001',
        appointmentId: 'apt-001',
        authorId: 'psycho-001',
        type: 'recommendation',
        name: 'Do yoga',
        text: 'Practice daily.',
        imageFiles: [],
        audioFiles: [],
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z',
        reaction: null,
        ...overrides,
    }
}

function renderCard(ui: React.ReactElement) {
    return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const FINALITY_COPY = "This is final — you won't be able to edit it later."

// ─── Client role ──────────────────────────────────────────────────────────────

describe('RecommendationCard — client role', () => {
    it('renders recommendation name', () => {
        renderCard(<RecommendationCard recommendation={makeRecommendation()} role="client" />)
        expect(screen.getByText('Do yoga')).toBeInTheDocument()
    })

    it('renders recommendation text', () => {
        renderCard(<RecommendationCard recommendation={makeRecommendation()} role="client" />)
        expect(screen.getByText('Practice daily.')).toBeInTheDocument()
    })

    it('renders done toggle for client', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="client"
                onToggleDone={vi.fn()}
            />,
        )
        expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('renders comment textarea when no comment set', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="client"
                onSubmitComment={vi.fn()}
            />,
        )
        expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders read-only comment when clientComment is set', () => {
        const recommendation = makeRecommendation({
            reaction: {
                attachmentId: 'rec-001',
                done: false,
                clientComment: 'Already commented',
                psychologistReply: null,
                updatedAt: '2026-04-01T10:00:00.000Z',
            },
        })
        renderCard(
            <RecommendationCard
                recommendation={recommendation}
                role="client"
                onSubmitComment={vi.fn()}
            />,
        )
        expect(screen.getByText('Already commented')).toBeInTheDocument()
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('calls onToggleDone when checkbox is toggled', async () => {
        const user = userEvent.setup()
        const onToggleDone = vi.fn().mockResolvedValue(undefined)
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="client"
                onToggleDone={onToggleDone}
            />,
        )

        await user.click(screen.getByRole('checkbox'))

        await waitFor(() => {
            expect(onToggleDone).toHaveBeenCalledWith('rec-001', true)
        })
    })

    it('shows finality copy in the comment-submit dialog', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="client"
                onSubmitComment={vi.fn()}
            />,
        )
        expect(screen.getByText('Send comment?')).toBeInTheDocument()
        expect(screen.getByText(FINALITY_COPY)).toBeInTheDocument()
    })

    it('calls onSubmitComment after the user confirms the dialog', async () => {
        const user = userEvent.setup()
        const onSubmitComment = vi.fn().mockResolvedValue(undefined)
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="client"
                onSubmitComment={onSubmitComment}
            />,
        )

        await user.type(screen.getByRole('textbox'), 'My comment')
        await user.click(screen.getByTestId('confirm-Send comment?'))

        await waitFor(() => {
            expect(onSubmitComment).toHaveBeenCalledWith('rec-001', 'My comment')
        })
    })
})

// ─── Psychologist role ────────────────────────────────────────────────────────

describe('RecommendationCard — psychologist role', () => {
    it('does not render a checkbox toggle', () => {
        renderCard(<RecommendationCard recommendation={makeRecommendation()} role="psycho" />)
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('renders client comment read-only when set', () => {
        const recommendation = makeRecommendation({
            reaction: {
                attachmentId: 'rec-001',
                done: true,
                clientComment: 'Client said this',
                psychologistReply: null,
                updatedAt: '2026-04-01T10:00:00.000Z',
            },
        })
        renderCard(<RecommendationCard recommendation={recommendation} role="psycho" />)
        expect(screen.getByText('Client said this')).toBeInTheDocument()
    })

    it('renders reply textarea when no reply set', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="psycho"
                onSubmitReply={vi.fn()}
            />,
        )
        expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders read-only reply when psychologistReply is set', () => {
        const recommendation = makeRecommendation({
            reaction: {
                attachmentId: 'rec-001',
                done: false,
                clientComment: null,
                psychologistReply: 'Great job!',
                updatedAt: '2026-04-01T10:00:00.000Z',
            },
        })
        renderCard(
            <RecommendationCard
                recommendation={recommendation}
                role="psycho"
                onSubmitReply={vi.fn()}
            />,
        )
        expect(screen.getByText('Great job!')).toBeInTheDocument()
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('shows finality copy in the reply-submit dialog', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="psycho"
                onSubmitReply={vi.fn()}
            />,
        )
        expect(screen.getByText('Send reply?')).toBeInTheDocument()
        expect(screen.getByText(FINALITY_COPY)).toBeInTheDocument()
    })

    it('calls onSubmitReply after the user confirms the dialog', async () => {
        const user = userEvent.setup()
        const onSubmitReply = vi.fn().mockResolvedValue(undefined)
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="psycho"
                onSubmitReply={onSubmitReply}
            />,
        )

        await user.type(screen.getByRole('textbox'), 'My reply')
        await user.click(screen.getByTestId('confirm-Send reply?'))

        await waitFor(() => {
            expect(onSubmitReply).toHaveBeenCalledWith('rec-001', 'My reply')
        })
    })

    it('renders the actions slot in the header', () => {
        renderCard(
            <RecommendationCard
                recommendation={makeRecommendation()}
                role="psycho"
                actions={<button>Edit</button>}
            />,
        )
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })
})
