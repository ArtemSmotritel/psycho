import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockAddByEmail = vi.fn()

vi.mock('~/services/client.service', () => ({
    clientService: {
        addByEmail: (...args: any[]) => mockAddByEmail(...args),
    },
}))

import { AddClientByEmailDialog } from '~/components/AddClientByEmailDialog'

function renderDialog(onSuccess = vi.fn()) {
    render(<AddClientByEmailDialog trigger={<button>Open</button>} onSuccess={onSuccess} />)
    fireEvent.click(screen.getByRole('button', { name: /open/i }))
}

describe('AddClientByEmailDialog', () => {
    beforeEach(() => {
        mockAddByEmail.mockReset()
    })

    it('submits email on form submit', async () => {
        mockAddByEmail.mockResolvedValue({
            data: { client: { id: '1', email: 'a@b.com', name: 'Alice', image: null } },
        })
        const onSuccess = vi.fn()
        renderDialog(onSuccess)

        fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
            target: { value: 'a@b.com' },
        })
        fireEvent.click(screen.getByRole('button', { name: /add client/i }))

        await waitFor(() => {
            expect(mockAddByEmail).toHaveBeenCalledWith('a@b.com')
            expect(onSuccess).toHaveBeenCalled()
        })
    })

    it('shows inline error when client is not found (ClientNotFound)', async () => {
        mockAddByEmail.mockRejectedValue({
            response: { data: { error: 'ClientNotFound' } },
        })
        renderDialog()

        fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
            target: { value: 'notfound@example.com' },
        })
        fireEvent.click(screen.getByRole('button', { name: /add client/i }))

        await waitFor(() => {
            expect(screen.getByText(/no account found for this email/i)).toBeInTheDocument()
        })
    })

    it('shows inline error when client is already linked (AlreadyLinked)', async () => {
        mockAddByEmail.mockRejectedValue({
            response: { data: { error: 'AlreadyLinked' } },
        })
        renderDialog()

        fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
            target: { value: 'linked@example.com' },
        })
        fireEvent.click(screen.getByRole('button', { name: /add client/i }))

        await waitFor(() => {
            expect(screen.getByText(/this client is already in your list/i)).toBeInTheDocument()
        })
    })

    it('submit button shows loading state during request', async () => {
        let resolveRequest!: () => void
        mockAddByEmail.mockReturnValue(
            new Promise<void>((res) => {
                resolveRequest = res
            }),
        )
        renderDialog()

        fireEvent.change(screen.getByPlaceholderText(/client@example.com/i), {
            target: { value: 'a@b.com' },
        })
        fireEvent.click(screen.getByRole('button', { name: /add client/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /adding\.\.\./i })).toBeInTheDocument()
        })

        resolveRequest()
    })
})
