import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'

vi.mock('react-media-recorder', () => ({
    useReactMediaRecorder: () => ({
        status: 'idle',
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        clearBlobUrl: vi.fn(),
    }),
}))

const mockListForPsycho = vi.fn()
const mockUpdateForPsycho = vi.fn()
const mockDeleteForPsycho = vi.fn()
const mockCreateForPsycho = vi.fn()

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        listForPsycho: (...args: any[]) => mockListForPsycho(...args),
        createForPsycho: (...args: any[]) => mockCreateForPsycho(...args),
        deleteForPsycho: (...args: any[]) => mockDeleteForPsycho(...args),
        updateForPsycho: (...args: any[]) => mockUpdateForPsycho(...args),
    },
    getDeleteAttachmentErrorMessage: () => 'Failed to delete attachment.',
    getCreateAttachmentErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock('~/components/common/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, title, onConfirm }: any) => (
        <div>
            {trigger}
            <button data-testid={`confirm-${title}`} onClick={onConfirm}>
                Confirm
            </button>
        </div>
    ),
}))

import { AppointmentNotesPanel } from '~/components/attachments/notes/AppointmentNotesPanel'
import { toast } from 'sonner'

const sampleNote = {
    id: 'note-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-001',
    type: 'note' as const,
    name: 'Session insight',
    text: 'Client opened up about ...',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
}

function renderPanel() {
    return render(
        <MemoryRouter>
            <AppointmentNotesPanel clientId="client-001" appointmentId="apt-001" />
        </MemoryRouter>,
    )
}

describe('AppointmentNotesPanel', () => {
    beforeEach(() => {
        mockListForPsycho.mockReset()
        mockUpdateForPsycho.mockReset()
        mockDeleteForPsycho.mockReset()
        mockCreateForPsycho.mockReset()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('renders an AttachmentListItem for each note with Open + Edit + Delete', async () => {
        mockListForPsycho.mockResolvedValue({ data: { notes: [sampleNote] } })

        renderPanel()

        await waitFor(() => {
            expect(screen.getByText('Session insight')).toBeInTheDocument()
        })
        // Body text rendered by AttachmentListItem.
        expect(screen.getByText('Client opened up about ...')).toBeInTheDocument()

        const openLink = screen.getByRole('link', { name: /open/i })
        expect(openLink).toHaveAttribute(
            'href',
            '/psycho/clients/client-001/appointments/apt-001/attachment/note-001',
        )
        expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
        // Delete trigger comes from ConfirmDeleteButton's default (a destructive button).
        expect(screen.getByTestId('confirm-Delete Note')).toBeInTheDocument()
    })

    it('refetches notes after a successful edit via EditAttachmentButton', async () => {
        const user = userEvent.setup()
        mockListForPsycho.mockResolvedValue({ data: { notes: [sampleNote] } })
        mockUpdateForPsycho.mockResolvedValue({ data: { attachment: sampleNote } })

        renderPanel()

        await waitFor(() => {
            expect(screen.getByText('Session insight')).toBeInTheDocument()
        })

        const callsBefore = mockListForPsycho.mock.calls.length
        await user.click(screen.getByRole('button', { name: /^edit$/i }))
        await waitFor(() => {
            expect(screen.getByDisplayValue('Session insight')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /save note/i }))

        await waitFor(() => {
            expect(mockUpdateForPsycho).toHaveBeenCalled()
        })
        await waitFor(() => {
            expect(mockListForPsycho.mock.calls.length).toBeGreaterThan(callsBefore)
        })
    })

    it('refetches notes after a successful delete via DeleteAttachmentButton', async () => {
        const user = userEvent.setup()
        mockListForPsycho.mockResolvedValue({ data: { notes: [sampleNote] } })
        mockDeleteForPsycho.mockResolvedValue(undefined)

        renderPanel()

        await waitFor(() => {
            expect(screen.getByText('Session insight')).toBeInTheDocument()
        })

        const callsBefore = mockListForPsycho.mock.calls.length
        await user.click(screen.getByTestId('confirm-Delete Note'))

        await waitFor(() => {
            expect(mockDeleteForPsycho).toHaveBeenCalledWith('client-001', 'apt-001', 'note-001')
        })
        await waitFor(() => {
            expect(mockListForPsycho.mock.calls.length).toBeGreaterThan(callsBefore)
        })
    })

    it('shows the empty message when there are no notes', async () => {
        mockListForPsycho.mockResolvedValue({ data: { notes: [] } })

        renderPanel()

        await waitFor(() => {
            expect(screen.getByText('No notes yet.')).toBeInTheDocument()
        })
    })

    it('shows the loading state while notes are pending', async () => {
        let resolveList: (value: any) => void = () => undefined
        mockListForPsycho.mockReturnValue(
            new Promise((res) => {
                resolveList = res
            }),
        )

        renderPanel()

        expect(screen.getByText('Loading notes...')).toBeInTheDocument()

        resolveList({ data: { notes: [sampleNote] } })

        await waitFor(() => {
            expect(screen.getByText('Session insight')).toBeInTheDocument()
        })
    })
})
