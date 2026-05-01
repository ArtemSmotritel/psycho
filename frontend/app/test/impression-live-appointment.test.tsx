import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockGetClientAppointmentById = vi.fn()
const mockImpressionSubmit = vi.fn()
const mockListForClient = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getClientAppointmentById: (...args: any[]) => mockGetClientAppointmentById(...args),
    },
}))

vi.mock('~/services/impression.service', () => ({
    impressionService: {
        submit: (...args: any[]) => mockImpressionSubmit(...args),
    },
}))

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForClient: (...args: any[]) => mockListForClient(...args),
    },
}))

vi.mock('~/hooks/useRoleGuard', () => ({
    useRoleGuard: () => ({ userRole: 'client' }),
}))

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('@excalidraw/excalidraw', () => ({
    Excalidraw: () => <div data-testid="excalidraw" />,
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

vi.mock('~/components/ui/sheet', () => ({
    Sheet: ({ children }: any) => <div>{children}</div>,
    SheetTrigger: ({ children }: any) => <div>{children}</div>,
    SheetContent: ({ children }: any) => <div>{children}</div>,
    SheetHeader: ({ children }: any) => <div>{children}</div>,
    SheetTitle: ({ children }: any) => <h2>{children}</h2>,
    SheetDescription: ({ children }: any) => <p>{children}</p>,
}))

vi.mock('~/components/AppPageHeader', () => ({
    AppPageHeader: ({ text }: any) => <h1>{text}</h1>,
}))

vi.mock('~/components/PageContainer', () => ({
    PageContainer: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('~/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

import LiveAppointment from '~/routes/client/live-appointment'
import { toast } from 'sonner'

const activeAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: null,
    status: 'active' as const,
    googleMeetLink: null,
    createdAt: '2026-03-10T15:00:00.000Z',
    psychoName: 'Dr. Smith',
}

const sampleImpression = {
    id: 'imp-001',
    appointmentId: 'apt-001',
    authorId: 'client-456',
    type: 'impression' as const,
    name: null,
    text: 'Felt good today.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:30:00.000Z',
    updatedAt: '2026-04-01T10:30:00.000Z',
}

function renderLiveAppointment(path = '/client/appointments/apt-001/live') {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route
                        path="/client/appointments/:appointmentId/live"
                        element={<LiveAppointment />}
                    />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('LiveAppointment — impressions section', () => {
    beforeEach(() => {
        mockGetClientAppointmentById.mockReset()
        mockImpressionSubmit.mockReset()
        mockListForClient.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.error).mockReset?.()
    })

    it('renders "My Impressions" section heading for active appointment', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })
        mockListForClient.mockResolvedValue({ data: { impressions: [] } })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })
    })

    it('shows existing impressions fetched on mount', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })
        mockListForClient.mockResolvedValue({
            data: { impressions: [sampleImpression] },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText('Felt good today.')).toBeInTheDocument()
        })
    })

    it('appends new impression to list after successful submit', async () => {
        const user = userEvent.setup()
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })
        mockListForClient.mockResolvedValue({ data: { impressions: [] } })

        const newImpression = { ...sampleImpression, id: 'imp-002', text: 'New impression text' }
        mockImpressionSubmit.mockResolvedValue({ data: { impression: newImpression } })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })

        await user.type(screen.getByRole('textbox'), 'New impression text')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(screen.getByText('New impression text')).toBeInTheDocument()
        })
    })

    it('shows toast.error when submit fails', async () => {
        const user = userEvent.setup()
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })
        mockListForClient.mockResolvedValue({ data: { impressions: [] } })
        mockImpressionSubmit.mockRejectedValue(new Error('Network error'))

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })

        await user.type(screen.getByRole('textbox'), 'Some text')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalled()
        })
    })
})
