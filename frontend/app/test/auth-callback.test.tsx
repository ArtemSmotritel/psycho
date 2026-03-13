import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock auth context
const mockSetActiveRole = vi.fn()
vi.mock('~/contexts/auth-context', () => ({
    useAuth: vi.fn(),
}))

// Mock react-router useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

import AuthCallback from '~/routes/auth-callback'
import { useAuth } from '~/contexts/auth-context'

describe('AuthCallback', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        mockSetActiveRole.mockReset()
        mockSetActiveRole.mockResolvedValue(undefined)
        sessionStorage.clear()
    })

    it('shows loading state while auth is pending', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: true,
            isAuthenticated: false,
            setActiveRole: mockSetActiveRole,
        } as any)

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('redirects to /login when not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: false,
            setActiveRole: mockSetActiveRole,
        } as any)

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('redirects to /login when intended_role is missing from sessionStorage', () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            setActiveRole: mockSetActiveRole,
        } as any)

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/login')
        expect(mockSetActiveRole).not.toHaveBeenCalled()
    })

    it('redirects to /psycho when intended_role is psycho', async () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            setActiveRole: mockSetActiveRole,
        } as any)

        sessionStorage.setItem('intended_role', 'psycho')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('psycho')
            expect(mockNavigate).toHaveBeenCalledWith('/psycho')
        })
        expect(sessionStorage.getItem('intended_role')).toBeNull()
    })

    it('redirects to /client when intended_role is client', async () => {
        vi.mocked(useAuth).mockReturnValue({
            isLoading: false,
            isAuthenticated: true,
            setActiveRole: mockSetActiveRole,
        } as any)

        sessionStorage.setItem('intended_role', 'client')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('client')
            expect(mockNavigate).toHaveBeenCalledWith('/client')
        })
        expect(sessionStorage.getItem('intended_role')).toBeNull()
    })
})
