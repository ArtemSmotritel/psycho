import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'

const mockEnd = vi.fn()
const mockNavigate = vi.fn()
let mockExcalidrawAPI: any = null

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getByIdForPsycho: vi.fn(),
        endForPsycho: (...args: any[]) => mockEnd(...args),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'psychologist' }),
}))

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, onConfirm }: any) => {
        return (
            <div>
                {trigger}
                <button data-testid="confirm-end" onClick={onConfirm}>
                    Confirm End
                </button>
            </div>
        )
    },
}))

vi.mock('~/components/ActionsSection', () => ({
    ActionsSection: ({ children }: any) => <div>{children}</div>,
    ActionItem: ({ label, disabled, onClick, href }: any) => {
        if (href) {
            return (
                <a href={href} data-testid={`action-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {label}
                </a>
            )
        }
        return (
            <button disabled={disabled} onClick={onClick}>
                {label}
            </button>
        )
    },
}))

const mockExportToBlob = vi.fn()

vi.mock('@excalidraw/excalidraw', () => ({
    Excalidraw: ({ excalidrawAPI }: any) => {
        // Allow tests to inject a fake API instance by calling the callback
        if (excalidrawAPI && mockExcalidrawAPI) {
            excalidrawAPI(mockExcalidrawAPI)
        }
        return <div data-testid="excalidraw" />
    },
    exportToBlob: (...args: any[]) => mockExportToBlob(...args),
}))

vi.mock('~/hooks/useWhiteboardSync', () => ({
    useWhiteboardSync: () => ({
        setExcalidrawAPI: vi.fn(),
        onWhiteboardChange: vi.fn(),
        onPointerUpdate: vi.fn(),
        remoteCursors: new Map(),
        connected: false,
    }),
}))

let mockCurrentClient: any = null

vi.mock('~/hooks/useCurrentClient', () => ({
    get useCurrentClient() {
        return () => mockCurrentClient
    },
}))

// Controlled mock for useCurrentAppointment
let mockUseCurrentAppointment: () => { appointment: any; isLoading: boolean }

vi.mock('~/hooks/useCurrentAppointment', () => ({
    get useCurrentAppointment() {
        return () => mockUseCurrentAppointment()
    },
}))

import LiveSession from '~/routes/psychologist/live-session'
import { toast } from 'sonner'

const activeAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: 'active' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
}

const activeAppointmentNoMeet = {
    ...activeAppointment,
    googleMeetLink: null,
}

const upcomingAppointment = {
    ...activeAppointment,
    status: 'upcoming' as const,
}

function renderLiveSession(path = '/psycho/clients/client-456/appointments/apt-001/live') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="/:role/clients/:clientId/appointments/:appointmentId/live"
                    element={<LiveSession />}
                />
            </Routes>
        </MemoryRouter>,
    )
}

describe('LiveSession page', () => {
    beforeEach(() => {
        mockEnd.mockReset()
        mockNavigate.mockReset()
        mockExportToBlob.mockReset()
        mockExcalidrawAPI = null
        // Default: client has an upcoming appointment so the post-session
        // follow-up prompt is suppressed and navigation happens right away.
        mockCurrentClient = {
            id: 'client-456',
            name: 'Test Client',
            email: 'client@example.com',
            image: null,
            username: null,
            phone: null,
            telegram: null,
            instagram: null,
            registrationDate: '2026-01-01T00:00:00.000Z',
            sessionsCount: 1,
            impressionsCount: 0,
            recommendationsCount: 0,
            lastAppointment: null,
            nextAppointment: { id: 'next-apt', startTime: '2026-05-01T10:00:00.000Z' },
        }
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('shows loading state while API is pending', () => {
        mockUseCurrentAppointment = () => ({ appointment: null, isLoading: true })

        renderLiveSession()

        expect(screen.getByText(/loading appointment/i)).toBeInTheDocument()
    })

    it('renders time range and elapsed timer for active appointment', () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })

        renderLiveSession()

        // date-fns PPP format for 2026-04-01
        expect(screen.getByText(/april 1(st)?, 2026/i)).toBeInTheDocument()
        // HH:mm range
        expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument()
        // elapsed timer starts at 00:00
        expect(screen.getByText('00:00')).toBeInTheDocument()
    })

    it('renders "Join Call" link when googleMeetLink is present', () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })

        renderLiveSession()

        expect(screen.getByText('Join Call')).toBeInTheDocument()
    })

    it('does not render "Join Call" when googleMeetLink is null', () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointmentNoMeet,
            isLoading: false,
        })

        renderLiveSession()

        expect(screen.queryByText('Join Call')).not.toBeInTheDocument()
    })

    it('calls appointmentService.end and navigates on confirm', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })
        mockEnd.mockResolvedValue({
            data: { appointment: { ...activeAppointment, status: 'past' } },
        })

        renderLiveSession()

        const confirmBtn = screen.getByTestId('confirm-end')
        await act(async () => {
            confirmBtn.click()
        })

        await waitFor(() => {
            expect(mockEnd).toHaveBeenCalledWith('client-456', 'apt-001', null)
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Appointment ended.')
            expect(mockNavigate).toHaveBeenCalledWith(
                '/psycho/clients/client-456/appointments/apt-001',
            )
        })
    })

    it('shows toast.error on API failure when ending', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })
        mockEnd.mockRejectedValue(new Error('Network error'))

        renderLiveSession()

        const confirmBtn = screen.getByTestId('confirm-end')
        await act(async () => {
            confirmBtn.click()
        })

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
                'Failed to end appointment. Please try again.',
            )
        })
    })

    it('shows error fallback when appointment is null', () => {
        mockUseCurrentAppointment = () => ({ appointment: null, isLoading: false })

        renderLiveSession()

        expect(screen.getByText(/no active appointment found/i)).toBeInTheDocument()
        expect(screen.getByText(/back to appointment/i)).toBeInTheDocument()
    })

    it('shows error fallback when appointment is not active (upcoming)', () => {
        mockUseCurrentAppointment = () => ({
            appointment: upcomingAppointment,
            isLoading: false,
        })

        renderLiveSession()

        expect(screen.getByText(/no active appointment found/i)).toBeInTheDocument()
    })

    it('calls exportToBlob and passes base64 data URL to appointmentService.end when API instance is available', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })

        const fakeBlob = new Blob(['fake-png-data'], { type: 'image/png' })
        mockExportToBlob.mockResolvedValue(fakeBlob)
        mockEnd.mockResolvedValue({
            data: { appointment: { ...activeAppointment, status: 'past' } },
        })

        const fakeElements = [{ id: 'el1' }]
        const fakeFiles = { file1: { id: 'file1' } }
        mockExcalidrawAPI = {
            getSceneElements: () => fakeElements,
            getFiles: () => fakeFiles,
            getAppState: () => ({ scrollX: 0, scrollY: 0 }),
        }

        renderLiveSession()

        const confirmBtn = screen.getByTestId('confirm-end')
        await act(async () => {
            confirmBtn.click()
        })

        await waitFor(() => {
            expect(mockExportToBlob).toHaveBeenCalledWith(
                expect.objectContaining({
                    elements: fakeElements,
                    files: fakeFiles,
                    mimeType: 'image/png',
                }),
            )
            const endCallArgs = mockEnd.mock.calls[0]
            expect(endCallArgs[0]).toBe('client-456')
            expect(endCallArgs[1]).toBe('apt-001')
            expect(typeof endCallArgs[2]).toBe('string')
            expect(endCallArgs[2]).toMatch(/^data:/)
        })
    })

    it('calls appointmentService.end with null when exportToBlob throws', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })

        mockExportToBlob.mockRejectedValue(new Error('Export failed'))
        mockEnd.mockResolvedValue({
            data: { appointment: { ...activeAppointment, status: 'past' } },
        })

        mockExcalidrawAPI = {
            getSceneElements: () => [],
            getFiles: () => ({}),
            getAppState: () => ({ scrollX: 0, scrollY: 0 }),
        }

        renderLiveSession()

        const confirmBtn = screen.getByTestId('confirm-end')
        await act(async () => {
            confirmBtn.click()
        })

        await waitFor(() => {
            expect(mockEnd).toHaveBeenCalledWith('client-456', 'apt-001', null)
        })
    })

    it('calls appointmentService.end with null when excalidrawAPIInstance is null', async () => {
        mockUseCurrentAppointment = () => ({
            appointment: activeAppointment,
            isLoading: false,
        })

        mockEnd.mockResolvedValue({
            data: { appointment: { ...activeAppointment, status: 'past' } },
        })

        // mockExcalidrawAPI is null (set in beforeEach)

        renderLiveSession()

        const confirmBtn = screen.getByTestId('confirm-end')
        await act(async () => {
            confirmBtn.click()
        })

        await waitFor(() => {
            expect(mockEnd).toHaveBeenCalledWith('client-456', 'apt-001', null)
        })
    })
})
