import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockDeleteForPsycho = vi.fn()
const mockDeleteForClient = vi.fn()
const mockGetDeleteAttachmentErrorMessage = vi.fn((_err: unknown) => 'Friendly delete error.')

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        deleteForPsycho: (...args: any[]) => mockDeleteForPsycho(...args),
        deleteForClient: (...args: any[]) => mockDeleteForClient(...args),
    },
    getDeleteAttachmentErrorMessage: (err: unknown) => mockGetDeleteAttachmentErrorMessage(err),
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

// Bypass the AlertDialog so the test can confirm directly via a known testid.
vi.mock('~/components/ConfirmAction', () => ({
    ConfirmAction: ({ trigger, title, onConfirm }: any) => (
        <div>
            {trigger}
            <button data-testid={`confirm-${title}`} onClick={onConfirm}>
                Confirm
            </button>
        </div>
    ),
}))

import { DeleteAttachmentButton } from '~/components/DeleteAttachmentButton'
import { toast } from 'sonner'
import type { Attachment } from '~/models/attachment'

const noteAttachment: Attachment = {
    id: 'att-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-001',
    type: 'note',
    name: 'A note',
    text: null,
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
}

describe('DeleteAttachmentButton', () => {
    beforeEach(() => {
        mockDeleteForPsycho.mockReset()
        mockDeleteForClient.mockReset()
        mockGetDeleteAttachmentErrorMessage.mockClear()
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('returns null for role="psycho" + type=impression', () => {
        const { container } = render(
            <DeleteAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'impression' }}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null for role="client" + type=note (clients cannot delete notes)', () => {
        const { container } = render(
            <DeleteAttachmentButton
                role="client"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('dispatches deleteForPsycho on confirm and toasts success + onSuccess for psycho/note', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        mockDeleteForPsycho.mockResolvedValue(undefined)

        render(
            <DeleteAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={onSuccess}
            />,
        )

        await user.click(screen.getByTestId('confirm-Delete Note'))

        await waitFor(() => {
            expect(mockDeleteForPsycho).toHaveBeenCalledWith('client-001', 'apt-001', 'att-001')
        })
        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Note deleted.')
            expect(onSuccess).toHaveBeenCalledTimes(1)
        })
        expect(mockDeleteForClient).not.toHaveBeenCalled()
    })

    it('dispatches deleteForClient on confirm for client/impression', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        mockDeleteForClient.mockResolvedValue(undefined)

        render(
            <DeleteAttachmentButton
                role="client"
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'impression' }}
                onSuccess={onSuccess}
            />,
        )

        await user.click(screen.getByTestId('confirm-Delete Impression'))

        await waitFor(() => {
            expect(mockDeleteForClient).toHaveBeenCalledWith('apt-001', 'att-001')
        })
        await waitFor(() => {
            expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Impression deleted.')
            expect(onSuccess).toHaveBeenCalledTimes(1)
        })
        expect(mockDeleteForPsycho).not.toHaveBeenCalled()
    })

    it('toasts the error message from getDeleteAttachmentErrorMessage on failure', async () => {
        const user = userEvent.setup()
        const onSuccess = vi.fn()
        const failure = new Error('boom')
        mockDeleteForPsycho.mockRejectedValue(failure)

        render(
            <DeleteAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'recommendation' }}
                onSuccess={onSuccess}
            />,
        )

        await user.click(screen.getByTestId('confirm-Delete Recommendation'))

        await waitFor(() => {
            expect(mockGetDeleteAttachmentErrorMessage).toHaveBeenCalledWith(failure)
            expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Friendly delete error.')
        })
        expect(onSuccess).not.toHaveBeenCalled()
    })

    it('renders the custom trigger when provided', () => {
        render(
            <DeleteAttachmentButton
                role="psycho"
                clientId="client-001"
                appointmentId="apt-001"
                attachment={noteAttachment}
                trigger={<button>Remove</button>}
                onSuccess={vi.fn()}
            />,
        )

        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })
})
