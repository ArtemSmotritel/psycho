import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// Mock auth service — factory must not reference top-level variables (hoisting constraint)
vi.mock('~/services/auth.service', () => ({
    auth: {
        useSession: vi.fn().mockReturnValue({ data: null, isPending: false }),
        signIn: {
            social: vi.fn(),
        },
        signOut: vi.fn(),
    },
}))

import LoginChoice from '~/routes/login'
import { auth } from '~/services/auth.service'

describe('LoginChoice', () => {
    beforeEach(() => {
        vi.mocked(auth.signIn.social).mockReset()
        sessionStorage.clear()
    })

    it('renders the sign in heading', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )
        expect(screen.getByText(/sign in to helpsycho/i)).toBeInTheDocument()
    })

    it('"Continue with Google" button is disabled until a role is selected', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )

        const button = screen.getByRole('button', { name: /continue with google/i })
        expect(button).toBeDisabled()
    })

    it('enables "Continue with Google" after selecting Psychologist', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText(/i'm a psychologist/i))
        const button = screen.getByRole('button', { name: /continue with google/i })
        expect(button).not.toBeDisabled()
    })

    it('enables "Continue with Google" after selecting Client', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText(/i'm a client/i))
        const button = screen.getByRole('button', { name: /continue with google/i })
        expect(button).not.toBeDisabled()
    })

    it('stores "psycho" in sessionStorage when Psychologist is selected and Continue is clicked', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText(/i'm a psychologist/i))
        fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

        expect(sessionStorage.getItem('intended_role')).toBe('psycho')
    })

    it('stores "client" in sessionStorage when Client is selected and Continue is clicked', () => {
        render(
            <MemoryRouter>
                <LoginChoice />
            </MemoryRouter>,
        )

        fireEvent.click(screen.getByText(/i'm a client/i))
        fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

        expect(sessionStorage.getItem('intended_role')).toBe('client')
    })
})
