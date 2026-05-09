import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('react-media-recorder', () => ({
    useReactMediaRecorder: () => ({
        status: 'idle',
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        clearBlobUrl: vi.fn(),
    }),
}))

const mockUpdateForPsycho = vi.fn()

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        updateForPsycho: (...args: any[]) => mockUpdateForPsycho(...args),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

import { EditAttachmentButton } from '~/components/attachments/EditAttachmentButton'
import { toast } from 'sonner'
import type { Attachment } from '~/models/attachment'

const noteAttachment: Attachment = {
    id: 'att-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-001',
    type: 'note',
    name: 'Original name',
    text: 'Original text',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
}

const impressionAttachment: Attachment = {
    ...noteAttachment,
    id: 'att-imp-001',
    type: 'impression',
}

describe('EditAttachmentButton', () => {
    beforeEach(() => {
        mockUpdateForPsycho.mockReset()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('returns null for role="client" (clients cannot edit any attachment type)', () => {
        const { container } = render(
            <EditAttachmentButton
                role="client"
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'recommendation' }}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null for role="psycho" + type=impression (psychos cannot edit impressions)', () => {
        const { container } = render(
            <EditAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={impressionAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('renders the default Edit trigger and opens the dialog when role="psycho" + type=note', async () => {
        const user = userEvent.setup()
        render(
            <EditAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )

        const trigger = screen.getByRole('button', { name: /edit/i })
        expect(trigger).toBeInTheDocument()

        await user.click(trigger)

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /edit note/i })).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Original name')).toBeInTheDocument()
    })

    it('calls updateForPsycho on submit and toasts success + onSuccess', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        mockUpdateForPsycho.mockResolvedValue({ data: { attachment: noteAttachment } })

        render(
            <EditAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={onSuccess}
            />,
        )

        await user.click(screen.getByRole('button', { name: /edit/i }))

        await waitFor(() => {
            expect(screen.getByDisplayValue('Original name')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /save note/i }))

        await waitFor(() => {
            expect(mockUpdateForPsycho).toHaveBeenCalledWith(
                'client-001',
                'apt-001',
                'att-001',
                expect.objectContaining({
                    name: 'Original name',
                    text: 'Original text',
                    removeFileIds: undefined,
                }),
            )
        })
        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Note updated.')
            expect(onSuccess).toHaveBeenCalledTimes(1)
        })
    })

    it('toasts error and does not call onSuccess when updateForPsycho rejects', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        mockUpdateForPsycho.mockRejectedValue(new Error('boom'))

        render(
            <EditAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={onSuccess}
            />,
        )

        await user.click(screen.getByRole('button', { name: /edit/i }))
        await waitFor(() => {
            expect(screen.getByDisplayValue('Original name')).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /save note/i }))

        await waitFor(() => {
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to update note.')
        })
        expect(onSuccess).not.toHaveBeenCalled()
    })

    it('renders a custom trigger when one is provided', () => {
        render(
            <EditAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                trigger={<button>Custom Edit</button>}
                onSuccess={vi.fn()}
            />,
        )

        expect(screen.getByRole('button', { name: /custom edit/i })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    })
})
