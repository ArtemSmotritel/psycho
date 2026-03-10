import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock auth service
vi.mock('~/services/auth.service', () => ({
    auth: {
        useSession: vi.fn(),
        signOut: vi.fn(),
    },
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
import { auth } from '~/services/auth.service'

describe('AuthCallback', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        sessionStorage.clear()
    })

    it('shows loading state while session is pending', () => {
        vi.mocked(auth.useSession).mockReturnValue({
            data: null,
            isPending: true,
        } as any)

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('redirects to /login when no session exists', () => {
        vi.mocked(auth.useSession).mockReturnValue({
            data: null,
            isPending: false,
        } as any)

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('redirects to /login when intended_role is missing from sessionStorage', () => {
        vi.mocked(auth.useSession).mockReturnValue({
            data: { user: { id: '1', email: 'test@test.com' }, session: {} },
            isPending: false,
        } as any)

        // No intended_role in sessionStorage
        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('redirects to /psycho when intended_role is psycho', () => {
        vi.mocked(auth.useSession).mockReturnValue({
            data: { user: { id: '1', email: 'test@test.com' }, session: {} },
            isPending: false,
        } as any)

        sessionStorage.setItem('intended_role', 'psycho')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/psycho')
        expect(sessionStorage.getItem('intended_role')).toBeNull()
    })

    it('redirects to /client when intended_role is client', () => {
        vi.mocked(auth.useSession).mockReturnValue({
            data: { user: { id: '1', email: 'test@test.com' }, session: {} },
            isPending: false,
        } as any)

        sessionStorage.setItem('intended_role', 'client')

        render(
            <MemoryRouter>
                <AuthCallback />
            </MemoryRouter>,
        )

        expect(mockNavigate).toHaveBeenCalledWith('/client')
        expect(sessionStorage.getItem('intended_role')).toBeNull()
    })
})
