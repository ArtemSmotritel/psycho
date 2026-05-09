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

import { AttachmentForm } from '~/components/attachments/AttachmentForm'

describe('AttachmentForm — uncontrolled', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the trigger and does not show dialog content until clicked', () => {
        render(
            <AttachmentForm type="note" trigger={<button>Add Note</button>} onSubmit={vi.fn()} />,
        )
        expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens dialog when trigger is clicked (create mode shows "Create Note" title)', async () => {
        const user = userEvent.setup()
        render(
            <AttachmentForm type="note" trigger={<button>Add Note</button>} onSubmit={vi.fn()} />,
        )

        await user.click(screen.getByRole('button', { name: /add note/i }))

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /create note/i })).toBeInTheDocument()
        })
    })

    it('renders edit-mode title and submit label using the type label', async () => {
        const user = userEvent.setup()
        render(
            <AttachmentForm
                type="recommendation"
                mode="edit"
                trigger={<button>Edit</button>}
                initialData={{ name: 'Existing', text: 'body' }}
                onSubmit={vi.fn()}
            />,
        )

        await user.click(screen.getByRole('button', { name: /edit/i }))

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: /edit recommendation/i }),
            ).toBeInTheDocument()
        })
        expect(screen.getByRole('button', { name: /save recommendation/i })).toBeInTheDocument()
    })

    it('uses generic "Impression" label (Phase 3) — no "Client Impression"', async () => {
        const user = userEvent.setup()
        render(
            <AttachmentForm
                type="impression"
                trigger={<button>New Impression</button>}
                onSubmit={vi.fn()}
            />,
        )

        await user.click(screen.getByRole('button', { name: /new impression/i }))

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: /^create impression$/i }),
            ).toBeInTheDocument()
        })
        expect(screen.queryByText(/client impression/i)).not.toBeInTheDocument()
    })

    it('prefills name and text from initialData', async () => {
        const user = userEvent.setup()
        render(
            <AttachmentForm
                type="note"
                mode="edit"
                trigger={<button>Edit</button>}
                initialData={{ name: 'Pre-filled name', text: 'Pre-filled text' }}
                onSubmit={vi.fn()}
            />,
        )

        await user.click(screen.getByRole('button', { name: /edit/i }))

        await waitFor(() => {
            expect(screen.getByDisplayValue('Pre-filled name')).toBeInTheDocument()
        })
        expect(screen.getByDisplayValue('Pre-filled text')).toBeInTheDocument()
    })

    it('shows validation error and does not call onSubmit when name is empty', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(
            <AttachmentForm type="note" trigger={<button>Add Note</button>} onSubmit={onSubmit} />,
        )

        await user.click(screen.getByRole('button', { name: /add note/i }))
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /create note/i }))

        await waitFor(() => {
            expect(screen.getByText(/name is required/i)).toBeInTheDocument()
        })
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit with form values and closes dialog on valid submit', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(
            <AttachmentForm type="note" trigger={<button>Add Note</button>} onSubmit={onSubmit} />,
        )

        await user.click(screen.getByRole('button', { name: /add note/i }))

        const nameInput = await screen.findByLabelText(/^name$/i)
        await user.type(nameInput, 'My note')

        await user.click(screen.getByRole('button', { name: /create note/i }))

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1)
        })
        expect(onSubmit.mock.calls[0][0]).toMatchObject({
            name: 'My note',
            text: '',
            voiceFiles: [],
            imageFiles: [],
            removedFileIds: [],
        })

        // dialog auto-closes
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })

    it('closes dialog when Cancel is clicked', async () => {
        const user = userEvent.setup()
        render(
            <AttachmentForm type="note" trigger={<button>Add Note</button>} onSubmit={vi.fn()} />,
        )

        await user.click(screen.getByRole('button', { name: /add note/i }))
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /cancel/i }))

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        })
    })
})

describe('AttachmentForm — controlled-open (new API)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders dialog when open=true (no trigger needed)', async () => {
        render(<AttachmentForm type="note" open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />)

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
        expect(screen.getByRole('heading', { name: /create note/i })).toBeInTheDocument()
    })

    it('does not render dialog when open=false', () => {
        render(
            <AttachmentForm type="note" open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
        )
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('calls onOpenChange(false) when Cancel is clicked', async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        render(
            <AttachmentForm
                type="note"
                open={true}
                onOpenChange={onOpenChange}
                onSubmit={vi.fn()}
            />,
        )

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /cancel/i }))

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false)
        })
    })

    it('parent controls visibility — Cancel does not auto-close the dialog when parent ignores onOpenChange', async () => {
        const user = userEvent.setup()
        // parent passes a no-op onOpenChange and keeps open=true → dialog stays open
        render(
            <AttachmentForm type="note" open={true} onOpenChange={() => {}} onSubmit={vi.fn()} />,
        )

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
        })
        await user.click(screen.getByRole('button', { name: /cancel/i }))

        // dialog still rendered because parent did not flip open prop
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('submitting valid form calls onSubmit and onOpenChange(false)', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        const onOpenChange = vi.fn()
        render(
            <AttachmentForm
                type="note"
                open={true}
                onOpenChange={onOpenChange}
                onSubmit={onSubmit}
            />,
        )

        const nameInput = await screen.findByLabelText(/^name$/i)
        await user.type(nameInput, 'Controlled note')
        await user.click(screen.getByRole('button', { name: /create note/i }))

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1)
        })
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Controlled note' })
        expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('controlled mode supports rendering a trigger as well — trigger click still requests open via onOpenChange', async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        render(
            <AttachmentForm
                type="note"
                open={false}
                onOpenChange={onOpenChange}
                trigger={<button>Add</button>}
                onSubmit={vi.fn()}
            />,
        )

        await user.click(screen.getByRole('button', { name: /add/i }))

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(true)
        })
        // dialog still not in DOM because parent has not flipped open prop
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
})
