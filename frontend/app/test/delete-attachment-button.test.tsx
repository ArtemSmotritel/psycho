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

const mockUseUserRole = vi.fn<() => 'psycho' | 'client' | null>(() => 'psycho')

vi.mock('~/contexts/auth-context', () => ({
    useUserRole: () => mockUseUserRole(),
}))

// Bypass the AlertDialog so the test can confirm directly via a known testid.
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

import { DeleteAttachmentButton } from '~/components/attachments/DeleteAttachmentButton'
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
        mockUseUserRole.mockReset()
        mockUseUserRole.mockReturnValue('psycho')
        vi.mocked(toast.success).mockReset?.()
        vi.mocked(toast.error).mockReset?.()
    })

    it('returns null when role=psycho + type=impression', () => {
        mockUseUserRole.mockReturnValue('psycho')
        const { container } = render(
            <DeleteAttachmentButton
                clientId="client-001"
                appointmentId="apt-001"
                attachment={{ ...noteAttachment, type: 'impression' }}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role=client + type=note (clients cannot delete notes)', () => {
        mockUseUserRole.mockReturnValue('client')
        const { container } = render(
            <DeleteAttachmentButton
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role is null (unauthenticated)', () => {
        mockUseUserRole.mockReturnValue(null)
        const { container } = render(
            <DeleteAttachmentButton
                appointmentId="apt-001"
                attachment={noteAttachment}
                onSuccess={vi.fn()}
            />,
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('returns null when role=psycho but clientId is missing', () => {
        mockUseUserRole.mockReturnValue('psycho')
        const { container } = render(
            <DeleteAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        mockDeleteForPsycho.mockResolvedValue(undefined)

        render(
            <DeleteAttachmentButton
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
        mockUseUserRole.mockReturnValue('client')
        mockDeleteForClient.mockResolvedValue(undefined)

        render(
            <DeleteAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        mockDeleteForPsycho.mockRejectedValue(failure)

        render(
            <DeleteAttachmentButton
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
        mockUseUserRole.mockReturnValue('psycho')
        render(
            <DeleteAttachmentButton
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
