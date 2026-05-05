import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockGetClientAppointmentById = vi.fn()
const mockCreateForClient = vi.fn()
const mockListForClient = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/appointment.service', () => ({
    appointmentService: {
        getByIdForClient: (...args: any[]) => mockGetClientAppointmentById(...args),
    },
}))

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForClient: (...args: any[]) => mockListForClient(...args),
        createForClient: (...args: any[]) => mockCreateForClient(...args),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
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

vi.mock('~/components/ActionsSection', () => ({
    ActionsSection: ({ children }: any) => <div>{children}</div>,
    ActionItem: ({ label, href }: any) => {
        if (href) {
            return (
                <a href={href} data-testid={`action-${label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {label}
                </a>
            )
        }
        return <button>{label}</button>
    },
}))

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

vi.mock('~/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <>{children}</>,
}))

vi.mock('~/services/file.service', () => ({
    fileService: {
        upload: vi.fn(),
    },
}))

vi.mock('react-media-recorder', () => ({
    useReactMediaRecorder: () => ({
        status: 'idle',
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        clearBlobUrl: vi.fn(),
    }),
}))

import LiveAppointment from '~/routes/client/live-appointment'

const activeAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: null,
    status: 'active' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
    psychoName: 'Dr. Smith',
}

const activeNoMeet = {
    ...activeAppointment,
    googleMeetLink: null,
}

const upcomingAppointment = {
    ...activeAppointment,
    status: 'upcoming' as const,
}

const pastAppointment = {
    ...activeAppointment,
    status: 'past' as const,
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

describe('LiveAppointment page', () => {
    beforeEach(() => {
        mockGetClientAppointmentById.mockReset()
        mockCreateForClient.mockReset()
        mockListForClient.mockReset()
        mockListForClient.mockResolvedValue({ data: { impressions: [] } })
        mockNavigate.mockReset()
    })

    it('shows loading state while initial fetch is pending', () => {
        // Never resolves
        mockGetClientAppointmentById.mockReturnValue(new Promise(() => {}))

        renderLiveAppointment()

        expect(screen.getByText(/loading appointment/i)).toBeInTheDocument()
    })

    it('renders formatted date and time range for active appointment', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/april 1(st)?, 2026/i)).toBeInTheDocument()
            expect(screen.getByText(/\d{2}:\d{2} – \d{2}:\d{2}/)).toBeInTheDocument()
        })
    })

    it('renders "Join Call" link when googleMeetLink is present', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText('Join Call')).toBeInTheDocument()
        })
    })

    it('does not render "Join Call" when googleMeetLink is null', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeNoMeet },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.queryByText('Join Call')).not.toBeInTheDocument()
        })
    })

    it('renders Excalidraw stub', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: activeAppointment },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByTestId('excalidraw')).toBeInTheDocument()
        })
    })

    it('shows fallback when appointment is null (fetch failed)', async () => {
        mockGetClientAppointmentById.mockRejectedValue(new Error('Not found'))

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/no active appointment found/i)).toBeInTheDocument()
        })
    })

    it('shows fallback when appointment status is upcoming', async () => {
        mockGetClientAppointmentById.mockResolvedValue({
            data: { appointment: upcomingAppointment },
        })

        renderLiveAppointment()

        await waitFor(() => {
            expect(screen.getByText(/no active appointment found/i)).toBeInTheDocument()
        })
    })

    describe('polling and modal (fake timers)', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        async function triggerPollAndModal() {
            // First call (initial fetch) returns active
            mockGetClientAppointmentById
                .mockResolvedValueOnce({ data: { appointment: activeAppointment } })
                // Subsequent calls (polls) return past
                .mockResolvedValue({ data: { appointment: pastAppointment } })

            renderLiveAppointment()

            // Flush the initial fetch promise
            await act(async () => {
                await Promise.resolve()
            })

            // Advance timer to trigger the 5s polling interval
            await act(async () => {
                vi.advanceTimersByTime(5000)
                // Flush the poll promise
                await Promise.resolve()
                await Promise.resolve()
            })
        }

        it('shows "Session Ended" modal title after poll tick returns past', async () => {
            await triggerPollAndModal()

            expect(screen.getByText('Session Ended')).toBeInTheDocument()
        })

        it('Cancel button in modal calls navigate (skip flow) without submitting', async () => {
            await triggerPollAndModal()

            expect(screen.getByText('Session Ended')).toBeInTheDocument()

            const cancelBtn = screen.getByRole('button', { name: /cancel/i })
            await act(async () => {
                fireEvent.click(cancelBtn)
                await Promise.resolve()
            })

            expect(mockNavigate).toHaveBeenCalledWith('/client/appointments/apt-001')
            expect(mockCreateForClient).not.toHaveBeenCalled()
        })

        it('submitting impression from modal calls createForClient with name+text and navigates', async () => {
            mockCreateForClient.mockResolvedValue({
                data: {
                    attachment: {
                        id: 'imp-new',
                        appointmentId: 'apt-001',
                        authorId: 'client-456',
                        type: 'impression',
                        name: 'How I felt',
                        text: 'Felt good today.',
                        imageFiles: [],
                        audioFiles: [],
                        createdAt: '2026-04-01T11:01:00.000Z',
                        updatedAt: '2026-04-01T11:01:00.000Z',
                    },
                },
            })

            await triggerPollAndModal()

            // Switch back to real timers so react-hook-form's validation / Promise chain resolves
            vi.useRealTimers()

            const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement
            fireEvent.change(nameInput, { target: { value: 'How I felt' } })

            const textArea = screen.getByLabelText(/text \(optional\)/i) as HTMLTextAreaElement
            fireEvent.change(textArea, { target: { value: 'Felt good today.' } })

            const submitBtn = screen.getByRole('button', { name: /create impression/i })
            fireEvent.click(submitBtn)

            await waitFor(() => {
                expect(mockCreateForClient).toHaveBeenCalledWith('apt-001', {
                    type: 'impression',
                    name: 'How I felt',
                    text: 'Felt good today.',
                    imageFileIds: [],
                    audioFileIds: [],
                })
            })
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/client/appointments/apt-001')
            })
        })

        it('does not auto-dismiss the modal after 5 seconds', async () => {
            await triggerPollAndModal()

            expect(screen.getByText('Session Ended')).toBeInTheDocument()
            // mockNavigate was not called yet — only the poll ran
            mockNavigate.mockClear()

            // Advance 10 seconds — no auto-dismiss timer should fire
            await act(async () => {
                vi.advanceTimersByTime(10000)
            })

            expect(mockNavigate).not.toHaveBeenCalled()
            expect(screen.getByText('Session Ended')).toBeInTheDocument()
        })
    })
})
