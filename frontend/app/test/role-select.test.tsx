import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

const mockSetActiveRole = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('~/contexts/auth-context', () => ({
    useAuth: () => mockUseAuth(),
}))

import RoleSelect from '~/routes/role-select'

describe('RoleSelect', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        mockSetActiveRole.mockReset()
    })

    it('shows loading state while loading', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isLoading: true,
            activeRole: null,
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('redirects to /login when user is not authenticated', () => {
        mockUseAuth.mockReturnValue({
            user: null,
            isLoading: false,
            activeRole: null,
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('redirects to /psycho/clients when activeRole is psycho', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'psycho' },
            isLoading: false,
            activeRole: 'psycho',
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/psycho/clients')
    })

    it('redirects to /client when activeRole is client', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'client' },
            isLoading: false,
            activeRole: 'client',
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/client')
    })

    it('calls setActiveRole and navigates to /psycho/clients on Psychologist card click', async () => {
        mockSetActiveRole.mockResolvedValue(undefined)
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: null },
            isLoading: false,
            activeRole: null,
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText('Psychologist'))

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('psycho')
            expect(mockNavigate).toHaveBeenCalledWith('/psycho/clients')
        })
    })

    it('calls setActiveRole and navigates to /client on Client card click', async () => {
        mockSetActiveRole.mockResolvedValue(undefined)
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: null },
            isLoading: false,
            activeRole: null,
            setActiveRole: mockSetActiveRole,
        })

        render(
            <MemoryRouter>
                <RoleSelect />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText('Client'))

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('client')
            expect(mockNavigate).toHaveBeenCalledWith('/client')
        })
    })
})
