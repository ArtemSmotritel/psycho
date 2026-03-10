import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock heavy dependencies
vi.mock('~/hooks/useCurrentClient', () => ({
    useCurrentClient: () => null,
}))

vi.mock('~/services/client.service', () => ({
    clientService: {
        getList: vi.fn().mockResolvedValue({ data: { clients: [] } }),
    },
}))

import { SessionForm } from '~/components/SessionForm'

function renderForm(onSubmit = vi.fn()) {
    render(
        <MemoryRouter>
            <SessionForm mode="add" trigger={<button>Open Form</button>} onSubmit={onSubmit} />
        </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /open form/i }))
}

describe('SessionForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the endTime field', async () => {
        renderForm()
        await waitFor(() => {
            expect(screen.getByText(/end time/i)).toBeInTheDocument()
        })
    })

    it('renders the startTime field', async () => {
        renderForm()
        await waitFor(() => {
            expect(screen.getByText(/start time/i)).toBeInTheDocument()
        })
    })

    it('renders dialog with "Schedule New Appointment" title in add mode', async () => {
        renderForm()
        await waitFor(() => {
            expect(screen.getByText(/schedule new appointment/i)).toBeInTheDocument()
        })
    })

    it('renders submit button labeled "Schedule Appointment" in add mode', async () => {
        renderForm()
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /schedule appointment/i }),
            ).toBeInTheDocument()
        })
    })
})
