import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

const mockGetList = vi.fn()

vi.mock('~/services/client.service', () => ({
    clientService: {
        getList: (...args: any[]) => mockGetList(...args),
    },
}))

vi.mock('~/contexts/auth-context', () => ({
    useAuth: () => ({
        user: { id: 'user-1', email: 'psycho@example.com', name: 'Dr. Smith', image: null },
        isLoading: false,
        isAuthenticated: true,
        activeRole: 'psycho',
        logout: vi.fn(),
        setActiveRole: vi.fn(),
    }),
}))

vi.mock('~/components/AddClientByEmailDialog', () => ({
    AddClientByEmailDialog: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}))

vi.mock('~/components/AppPageHeader', () => ({
    AppPageHeader: ({ text }: { text: string }) => <h1>{text}</h1>,
}))

vi.mock('@/components/DataTablePagination', () => ({
    DataTablePagination: () => <div data-testid="pagination" />,
}))

import Clients from '~/routes/psychologist/clients'

describe('Clients route', () => {
    beforeEach(() => {
        mockGetList.mockReset()
    })

    it('shows loading state before data arrives', () => {
        let resolve!: (val: any) => void
        mockGetList.mockReturnValue(
            new Promise((res) => {
                resolve = res
            }),
        )

        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>,
        )

        expect(screen.getByText(/loading clients/i)).toBeInTheDocument()
        resolve({ data: { clients: [] } })
    })

    it('fetches client list on mount and renders name and email columns', async () => {
        mockGetList.mockResolvedValue({
            data: {
                clients: [
                    { id: '1', name: 'Alice Smith', email: 'alice@example.com', image: null },
                    { id: '2', name: 'Bob Jones', email: 'bob@example.com', image: null },
                ],
            },
        })

        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByText('Alice Smith')).toBeInTheDocument()
            expect(screen.getByText('alice@example.com')).toBeInTheDocument()
            expect(screen.getByText('Bob Jones')).toBeInTheDocument()
            expect(screen.getByText('bob@example.com')).toBeInTheDocument()
        })
    })

    it('shows error state on API failure', async () => {
        mockGetList.mockRejectedValue(new Error('Network error'))

        render(
            <MemoryRouter>
                <Clients />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(screen.getByText(/failed to load clients/i)).toBeInTheDocument()
        })
    })
})
