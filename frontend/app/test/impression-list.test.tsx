import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImpressionList } from '~/components/ImpressionList'
import type { Attachment } from '~/models/attachment'

const makeImpression = (overrides: Partial<Attachment> = {}): Attachment => ({
    id: 'imp-001',
    appointmentId: 'apt-001',
    authorId: 'user-001',
    type: 'impression',
    name: null,
    text: 'Felt much better today.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:30:00.000Z',
    updatedAt: '2026-04-01T10:30:00.000Z',
    ...overrides,
})

describe('ImpressionList', () => {
    it('renders "No impressions yet." when empty and not loading', () => {
        render(<ImpressionList impressions={[]} isLoading={false} />)

        expect(screen.getByText(/no impressions yet/i)).toBeInTheDocument()
    })

    it('renders text and timestamp for each impression', () => {
        const impressions = [
            makeImpression({ id: 'imp-001', text: 'First impression' }),
            makeImpression({
                id: 'imp-002',
                text: 'Second impression',
                createdAt: '2026-04-01T11:00:00.000Z',
            }),
        ]

        render(<ImpressionList impressions={impressions} isLoading={false} />)

        expect(screen.getByText('First impression')).toBeInTheDocument()
        expect(screen.getByText('Second impression')).toBeInTheDocument()
    })

    it('shows spinner while loading', () => {
        render(<ImpressionList impressions={[]} isLoading={true} />)

        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('does not show "No impressions yet." while loading', () => {
        render(<ImpressionList impressions={[]} isLoading={true} />)

        expect(screen.queryByText(/no impressions yet/i)).not.toBeInTheDocument()
    })
})
