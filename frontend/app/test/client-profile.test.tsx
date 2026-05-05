import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockRemove = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/client.service', () => ({
    clientService: {
        deleteForPsycho: (...args: any[]) => mockRemove(...args),
        getListForPsycho: vi.fn(),
        getByIdForPsycho: vi.fn(),
        addByEmailForPsycho: vi.fn(),
        updateForPsycho: vi.fn(),
    },
}))

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock heavier components that are not under test
vi.mock('~/components/ProtectedComponent', () => ({
    ProtectedComponent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('~/components/ClientForm', () => ({
    ClientForm: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}))

vi.mock('~/components/SessionForm', () => ({
    SessionForm: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}))

vi.mock('~/hooks/useCurrentClient', () => ({
    useCurrentClient: () => ({
        id: 'client-123',
        name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
        phone: '+1234567890',
        telegram: '@johndoe',
        instagram: '@johndoe',
        registrationDate: '2026-01-01T00:00:00.000Z',
        sessionsCount: 5,
        impressionsCount: 10,
        recommendationsCount: 3,
        lastAppointment: null,
        nextAppointment: null,
    }),
}))

import ClientProfile from '~/routes/psychologist/client-profile'
import { toast } from 'sonner'

function renderWithRouter(clientId = 'client-123', role = 'psycho') {
    return render(
        <MemoryRouter initialEntries={[`/${role}/clients/${clientId}`]}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId"
                    element={<ClientProfile params={{ clientId }} />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('ClientProfile — Remove client action', () => {
    beforeEach(() => {
        mockRemove.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.error).mockReset?.()
    })

    it('renders a "Remove client" button', () => {
        renderWithRouter()
        expect(screen.getByRole('button', { name: /remove client/i })).toBeInTheDocument()
    })

    it('clicking "Remove client" opens a confirmation dialog', async () => {
        renderWithRouter()
        fireEvent.click(screen.getByRole('button', { name: /remove client/i }))
        await waitFor(() => {
            expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        })
    })

    it('cancelling the dialog does not call clientService.remove', async () => {
        renderWithRouter()
        fireEvent.click(screen.getByRole('button', { name: /remove client/i }))
        await waitFor(() => {
            expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
        expect(mockRemove).not.toHaveBeenCalled()
    })

    it('confirming calls clientService.remove with the correct client id', async () => {
        mockRemove.mockResolvedValue({})
        renderWithRouter('client-123')
        fireEvent.click(screen.getByRole('button', { name: /remove client/i }))
        await waitFor(() => {
            expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
        await waitFor(() => {
            expect(mockRemove).toHaveBeenCalledWith('client-123')
        })
    })

    it('navigates to /:role/clients on successful removal', async () => {
        mockRemove.mockResolvedValue({})
        renderWithRouter('client-123', 'psycho')
        fireEvent.click(screen.getByRole('button', { name: /remove client/i }))
        await waitFor(() => {
            expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/psycho/clients')
        })
    })

    it('shows a toast on API error', async () => {
        mockRemove.mockRejectedValue(new Error('Network error'))
        renderWithRouter('client-123')
        fireEvent.click(screen.getByRole('button', { name: /remove client/i }))
        await waitFor(() => {
            expect(screen.getByRole('alertdialog')).toBeInTheDocument()
        })
        fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))
        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalled()
        })
    })
})
