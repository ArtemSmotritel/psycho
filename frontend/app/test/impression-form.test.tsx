import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImpressionForm } from '~/components/ImpressionForm'

describe('ImpressionForm', () => {
    it('renders a textarea and submit button', () => {
        render(<ImpressionForm onSubmit={vi.fn()} isSubmitting={false} />)

        expect(screen.getByRole('textbox')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('disables textarea and button while isSubmitting', () => {
        render(<ImpressionForm onSubmit={vi.fn()} isSubmitting={true} />)

        expect(screen.getByRole('textbox')).toBeDisabled()
        expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })

    it('calls onSubmit with the entered text', async () => {
        const user = userEvent.setup()
        const mockSubmit = vi.fn().mockResolvedValue(undefined)

        render(<ImpressionForm onSubmit={mockSubmit} isSubmitting={false} />)

        await user.type(screen.getByRole('textbox'), 'My impression text')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(mockSubmit).toHaveBeenCalledWith('My impression text')
        })
    })

    it('clears textarea after successful submit', async () => {
        const user = userEvent.setup()
        const mockSubmit = vi.fn().mockResolvedValue(undefined)

        render(<ImpressionForm onSubmit={mockSubmit} isSubmitting={false} />)

        const textarea = screen.getByRole('textbox')
        await user.type(textarea, 'Some text')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(textarea).toHaveValue('')
        })
    })
})
