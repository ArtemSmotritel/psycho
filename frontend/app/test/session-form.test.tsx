import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock heavy dependencies
vi.mock('~/hooks/useCurrentClient', () => ({
    useCurrentClient: () => null,
}))

vi.mock('~/services/client.service', () => ({
    clientService: {
        getListForPsycho: vi.fn().mockResolvedValue({ data: { clients: [] } }),
    },
}))

import { SessionForm } from '~/components/SessionForm'
import type { SessionFormProps } from '~/components/session-form/schema'

function renderForm(onSubmit = vi.fn(), extraProps: Partial<SessionFormProps> = {}) {
    render(
        <MemoryRouter>
            <SessionForm
                mode="add"
                trigger={<button>Open Form</button>}
                onSubmit={onSubmit}
                {...extraProps}
            />
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

    it('keeps the client selector enabled by default', async () => {
        renderForm()
        expect(await screen.findByRole('combobox')).toBeEnabled()
    })

    it('disables the client selector when lockClient is set', async () => {
        renderForm(vi.fn(), { lockClient: true })
        expect(await screen.findByRole('combobox')).toBeDisabled()
    })

    it('renders submit button labeled "Schedule Appointment" in add mode', async () => {
        renderForm()
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /schedule appointment/i }),
            ).toBeInTheDocument()
        })
    })

    describe('end time follows start time', () => {
        const openPicker = async (label: RegExp) => {
            const group = screen.getByText(label).closest('div')!
            fireEvent.click(group.querySelector('button')!)
        }

        it('sets end time to start time + 1 hour in add mode', async () => {
            const start = new Date(2099, 5, 1, 9, 0)
            renderForm(vi.fn(), {
                initialData: { startTime: start, endTime: new Date(2099, 5, 1, 9, 30) },
            })
            await openPicker(/start time/i)
            const input = await waitFor(() => {
                const el = document.querySelector('input[type="time"]')
                expect(el).not.toBeNull()
                return el as HTMLInputElement
            })
            fireEvent.change(input, { target: { value: '14:15' } })
            fireEvent.keyDown(document.body, { key: 'Escape' })
            await waitFor(() => {
                expect(screen.getByText(/15:15/)).toBeInTheDocument()
            })
        })

        it('does the same in edit mode, but not before the user edits', async () => {
            const start = new Date(2099, 5, 1, 9, 0)
            renderForm(vi.fn(), {
                mode: 'edit',
                initialData: { startTime: start, endTime: new Date(2099, 5, 1, 9, 30) },
            })
            expect(await screen.findByText(/09:30/)).toBeInTheDocument()
            await openPicker(/start time/i)
            const input = await waitFor(() => {
                const el = document.querySelector('input[type="time"]')
                expect(el).not.toBeNull()
                return el as HTMLInputElement
            })
            fireEvent.change(input, { target: { value: '11:00' } })
            fireEvent.keyDown(document.body, { key: 'Escape' })
            await waitFor(() => {
                expect(screen.getByText(/12:00/)).toBeInTheDocument()
            })
        })
    })
})
