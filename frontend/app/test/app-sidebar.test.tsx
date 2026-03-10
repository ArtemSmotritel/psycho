import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

// jsdom does not implement window.matchMedia — stub it so SidebarProvider works
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// jsdom does not implement ResizeObserver — stub it so Radix UI tooltip works
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

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
const mockUseHasActiveAppointment = vi.fn()

vi.mock('~/contexts/auth-context', () => ({
    useAuth: () => mockUseAuth(),
}))

vi.mock('~/hooks/useHasActiveAppointment', () => ({
    useHasActiveAppointment: () => mockUseHasActiveAppointment(),
}))

// useSidebarItems depends on useRoleGuard which depends on useAuth — mock it directly
vi.mock('~/hooks/useSidebarItems', () => ({
    useSidebarItems: () => [],
}))

import { AppSidebar } from '~/components/AppSidebar'
import { SidebarProvider } from '~/components/ui/sidebar'

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <MemoryRouter>
            <SidebarProvider>{ui}</SidebarProvider>
        </MemoryRouter>,
    )
}

describe('AppSidebar role switcher', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        mockSetActiveRole.mockReset()
    })

    it('switch button is disabled when hasActiveAppointment is true', () => {
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'psycho' },
            isLoading: false,
            isAuthenticated: true,
            activeRole: 'psycho',
            setActiveRole: mockSetActiveRole,
        })
        mockUseHasActiveAppointment.mockReturnValue({ hasActiveAppointment: true })

        renderWithProviders(<AppSidebar />)

        const switchButton = screen.getByRole('button', { name: /switch to client/i })
        expect(switchButton).toBeDisabled()
    })

    it('shows tooltip content on hover when disabled', async () => {
        const user = userEvent.setup()
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'psycho' },
            isLoading: false,
            isAuthenticated: true,
            activeRole: 'psycho',
            setActiveRole: mockSetActiveRole,
        })
        mockUseHasActiveAppointment.mockReturnValue({ hasActiveAppointment: true })

        renderWithProviders(<AppSidebar />)

        const trigger = screen.getByRole('button', { name: /switch to client/i }).parentElement!
        await user.hover(trigger)

        await waitFor(() => {
            // Tooltip renders in a portal outside the render container — query document.body
            expect(document.body.textContent).toMatch(
                /end your active appointment before switching roles/i,
            )
        })
    })

    it('calls setActiveRole and navigates to client dashboard when psycho switches to client', async () => {
        mockSetActiveRole.mockResolvedValue(undefined)
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'psycho' },
            isLoading: false,
            isAuthenticated: true,
            activeRole: 'psycho',
            setActiveRole: mockSetActiveRole,
        })
        mockUseHasActiveAppointment.mockReturnValue({ hasActiveAppointment: false })

        renderWithProviders(<AppSidebar />)

        const switchButton = screen.getByRole('button', { name: /switch to client/i })
        fireEvent.click(switchButton)

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('client')
            expect(mockNavigate).toHaveBeenCalledWith('/client')
        })
    })

    it('calls setActiveRole and navigates to psycho dashboard when client switches to psycho', async () => {
        mockSetActiveRole.mockResolvedValue(undefined)
        mockUseAuth.mockReturnValue({
            user: { id: '1', email: 'a@b.com', name: 'User', image: null, activeRole: 'client' },
            isLoading: false,
            isAuthenticated: true,
            activeRole: 'client',
            setActiveRole: mockSetActiveRole,
        })
        mockUseHasActiveAppointment.mockReturnValue({ hasActiveAppointment: false })

        renderWithProviders(<AppSidebar />)

        const switchButton = screen.getByRole('button', { name: /switch to psychologist/i })
        fireEvent.click(switchButton)

        await waitFor(() => {
            expect(mockSetActiveRole).toHaveBeenCalledWith('psycho')
            expect(mockNavigate).toHaveBeenCalledWith('/psycho/clients')
        })
    })
})
