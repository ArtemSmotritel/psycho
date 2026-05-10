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

const mockUseUserRole = vi.fn<() => 'psycho' | 'client' | null>(() => 'psycho')

vi.mock('~/contexts/auth-context', () => ({
    useUserRole: () => mockUseUserRole(),
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
        mockUseUserRole.mockReset()
        mockUseUserRole.mockReturnValue('psycho')
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('returns null when role=client (clients cannot edit any attachment type)', () => {
        mockUseUserRole.mockReturnValue('client')
        const { container } = render(
            <EditAttachmentButton
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'recommendation' }}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role is null (unauthenticated)', () => {
        mockUseUserRole.mockReturnValue(null)
        const { container } = render(
            <EditAttachmentButton
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role=psycho + type=impression (psychos cannot edit impressions)', () => {
        mockUseUserRole.mockReturnValue('psycho')
        const { container } = render(
            <EditAttachmentButton
                clientId="client-001"
                appointmentId="apt-001"
                attachment={impressionAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role=psycho but clientId is missing', () => {
        mockUseUserRole.mockReturnValue('psycho')
        const { container } = render(
            <EditAttachmentButton
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('renders the default Edit trigger and opens the dialog when role=psycho + type=note', async () => {
        const user = userEvent.setup()
        mockUseUserRole.mockReturnValue('psycho')
        render(
            <EditAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        mockUpdateForPsycho.mockResolvedValue({ data: { attachment: noteAttachment } })

        render(
            <EditAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        mockUpdateForPsycho.mockRejectedValue(new Error('boom'))

        render(
            <EditAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        render(
            <EditAttachmentButton
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
