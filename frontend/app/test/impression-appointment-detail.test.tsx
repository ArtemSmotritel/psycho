import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockCreateForClient = vi.fn()
const mockListForClient = vi.fn()

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForClient: (...args: any[]) => mockListForClient(...args),
        createForClient: (...args: any[]) => mockCreateForClient(...args),
    },
    getCreateAttachmentErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

vi.mock('~/services/file.service', () => ({
    fileService: {
        upload: vi.fn(),
    },
    resolveAttachmentFileIds: vi.fn(async () => ({ audioFileIds: [], imageFileIds: [] })),
}))

vi.mock('react-media-recorder', () => ({
    useReactMediaRecorder: () => ({
        status: 'idle',
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        clearBlobUrl: vi.fn(),
    }),
}))

let mockUseCurrentClientAppointment: () => { appointment: any; isLoading: boolean }

vi.mock('~/hooks/useCurrentClientAppointment', () => ({
    get useCurrentClientAppointment() {
        return () => mockUseCurrentClientAppointment()
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('~/contexts/auth-context', () => ({
    useUserRole: () => 'client',
}))

import ClientAppointmentDetail from '~/routes/client/appointment-detail'
import { toast } from 'sonner'

const pastAppointment = {
    id: 'apt-001',
    clientId: 'client-456',
    psychoId: 'psycho-123',
    startTime: '2026-04-01T10:00:00.000Z',
    endTime: '2026-04-01T11:00:00.000Z',
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: '2026-04-01T11:00:00.000Z',
    status: 'past' as const,
    googleMeetLink: 'https://meet.google.com/abc',
    createdAt: '2026-03-10T15:00:00.000Z',
    psychoName: 'Dr. Smith',
}

const sampleImpression = {
    id: 'imp-001',
    appointmentId: 'apt-001',
    authorId: 'client-456',
    type: 'impression' as const,
    name: 'How I felt',
    text: 'Felt very relaxed.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:30:00.000Z',
    updatedAt: '2026-04-01T10:30:00.000Z',
}

function renderDetail(path = '/client/appointments/apt-001') {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route
                        path="/client/appointments/:appointmentId"
                        element={<ClientAppointmentDetail />}
                    />
                    <Route path="*" element={<div data-testid="redirected" />} />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('ClientAppointmentDetail — past appointment with impressions', () => {
    beforeEach(() => {
        mockCreateForClient.mockReset()
        mockListForClient.mockReset()
        vi.mocked(toast.error).mockReset?.()
    })

    it('renders impressions from API for past appointment', async () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointment,
            isLoading: false,
        })
        mockListForClient.mockResolvedValue({
            data: { impressions: [sampleImpression], recommendations: [] },
        })

        renderDetail()

        await waitFor(() => {
            expect(screen.getByText('Felt very relaxed.')).toBeInTheDocument()
        })
    })

    it('renders "My Impressions" heading for past appointment', async () => {
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointment,
            isLoading: false,
        })
        mockListForClient.mockResolvedValue({ data: { impressions: [], recommendations: [] } })

        renderDetail()

        await waitFor(() => {
            expect(screen.getByText(/my impressions/i)).toBeInTheDocument()
        })
    })

    it('submit form calls attachmentService.createForClient for past appointment', async () => {
        const user = userEvent.setup()
        mockUseCurrentClientAppointment = () => ({
            appointment: pastAppointment,
            isLoading: false,
        })
        mockListForClient.mockResolvedValue({ data: { impressions: [], recommendations: [] } })
        const newImpression = {
            ...sampleImpression,
            id: 'imp-002',
            name: 'New name',
            text: 'New reflection',
        }
        mockCreateForClient.mockResolvedValue({ data: { attachment: newImpression } })

        renderDetail()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /add impression/i })).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /add impression/i }))

        const nameInput = await screen.findByLabelText(/^name$/i)
        await user.type(nameInput, 'New name')
        await user.type(screen.getByLabelText(/text \(optional\)/i), 'New reflection')
        await user.click(screen.getByRole('button', { name: /create impression/i }))

        await waitFor(() => {
            expect(mockCreateForClient).toHaveBeenCalledWith('apt-001', {
                type: 'impression',
                name: 'New name',
                text: 'New reflection',
                imageFileIds: [],
                audioFileIds: [],
            })
        })
    })
})
