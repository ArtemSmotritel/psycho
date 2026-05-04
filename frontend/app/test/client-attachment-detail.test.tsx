import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SidebarProvider } from '~/components/ui/sidebar'

const mockGetByIdForClient = vi.fn()
const mockDeleteForClient = vi.fn()
const mockReact = vi.fn()
const mockNavigate = vi.fn()

vi.mock('~/services/attachment.service', () => ({
    attachmentService: {
        getByIdForClient: (...args: any[]) => mockGetByIdForClient(...args),
        deleteForClient: (...args: any[]) => mockDeleteForClient(...args),
    },
    getDeleteAttachmentErrorMessage: () => 'Failed to delete attachment. Please try again.',
}))

vi.mock('~/services/recommendation.service', () => ({
    recommendationService: {
        react: (...args: any[]) => mockReact(...args),
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

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

import ClientAttachmentDetail from '~/routes/client/attachment-detail'
import { toast } from 'sonner'

const baseImpression = {
    id: 'imp-001',
    appointmentId: 'apt-001',
    authorId: 'client-456',
    type: 'impression' as const,
    name: 'How I felt',
    text: 'Felt at ease.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:30:00.000Z',
    updatedAt: '2026-04-01T10:30:00.000Z',
}

const baseRecommendation = {
    id: 'rec-001',
    appointmentId: 'apt-001',
    authorId: 'psycho-123',
    type: 'recommendation' as const,
    name: 'Do yoga',
    text: 'Practice daily.',
    imageFiles: [],
    audioFiles: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
}

function renderRoute(path = '/client/appointments/apt-001/attachment/imp-001') {
    return render(
        <SidebarProvider>
            <MemoryRouter initialEntries={[path]}>
                <Routes>
                    <Route
                        path="/client/appointments/:appointmentId/attachment/:attachmentId"
                        element={<ClientAttachmentDetail />}
                    />
                    <Route path="*" element={<div data-testid="redirected" />} />
                </Routes>
            </MemoryRouter>
        </SidebarProvider>,
    )
}

describe('ClientAttachmentDetail — impression', () => {
    beforeEach(() => {
        mockGetByIdForClient.mockReset()
        mockDeleteForClient.mockReset()
        mockReact.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.error).mockReset?.()
        vi.mocked(toast.success).mockReset?.()
    })

    it('renders impression name, type label, and description', async () => {
        mockGetByIdForClient.mockResolvedValue({ data: { attachment: baseImpression } })

        renderRoute()

        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'How I felt' })).toBeInTheDocument()
        })
        // Type label + date subtitle
        expect(screen.getByText(/april 1/i)).toBeInTheDocument()
        expect(screen.getByText('Felt at ease.')).toBeInTheDocument()
    })

    it('renders Delete Impression action and calls deleteForClient on confirm', async () => {
        const user = userEvent.setup()
        mockGetByIdForClient.mockResolvedValue({ data: { attachment: baseImpression } })
        mockDeleteForClient.mockResolvedValue(undefined)

        renderRoute()

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /delete impression/i })).toBeInTheDocument()
        })

        await user.click(screen.getByRole('button', { name: /delete impression/i }))

        // confirmation dialog
        const confirmBtn = await screen.findByRole('button', { name: /^delete$/i })
        await user.click(confirmBtn)

        await waitFor(() => {
            expect(mockDeleteForClient).toHaveBeenCalledWith('apt-001', 'imp-001')
        })
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/client/appointments/apt-001')
        })
    })

    it('renders fallback when attachment fetch fails', async () => {
        mockGetByIdForClient.mockRejectedValue(new Error('Not found'))

        renderRoute()

        await waitFor(() => {
            expect(screen.getByText(/attachment not found/i)).toBeInTheDocument()
        })
    })
})

describe('ClientAttachmentDetail — recommendation', () => {
    beforeEach(() => {
        mockGetByIdForClient.mockReset()
        mockDeleteForClient.mockReset()
        mockReact.mockReset()
        mockNavigate.mockReset()
        vi.mocked(toast.error).mockReset?.()
        vi.mocked(toast.success).mockReset?.()
    })

    it('renders Status row with current done state', async () => {
        mockGetByIdForClient.mockResolvedValue({
            data: {
                attachment: baseRecommendation,
                reaction: {
                    attachmentId: 'rec-001',
                    done: true,
                    clientComment: null,
                    psychologistReply: null,
                    updatedAt: '2026-04-01T11:00:00.000Z',
                },
            },
        })

        renderRoute('/client/appointments/apt-001/attachment/rec-001')

        await waitFor(() => {
            expect(screen.getByText('Status')).toBeInTheDocument()
        })
        expect(screen.getByText('Done')).toBeInTheDocument()
    })

    it('does not render Delete action for recommendation', async () => {
        mockGetByIdForClient.mockResolvedValue({
            data: { attachment: baseRecommendation, reaction: null },
        })

        renderRoute('/client/appointments/apt-001/attachment/rec-001')

        await waitFor(() => {
            expect(screen.getByText('Do yoga')).toBeInTheDocument()
        })
        expect(screen.queryByRole('button', { name: /delete impression/i })).not.toBeInTheDocument()
    })

    it('submits write-once clientComment and refetches', async () => {
        const user = userEvent.setup()
        mockGetByIdForClient
            .mockResolvedValueOnce({
                data: { attachment: baseRecommendation, reaction: null },
            })
            .mockResolvedValueOnce({
                data: {
                    attachment: baseRecommendation,
                    reaction: {
                        attachmentId: 'rec-001',
                        done: false,
                        clientComment: 'Worked great!',
                        psychologistReply: null,
                        updatedAt: '2026-04-01T12:00:00.000Z',
                    },
                },
            })
        mockReact.mockResolvedValue({
            data: {
                reaction: {
                    attachmentId: 'rec-001',
                    done: false,
                    clientComment: 'Worked great!',
                    psychologistReply: null,
                    updatedAt: '2026-04-01T12:00:00.000Z',
                },
            },
        })

        renderRoute('/client/appointments/apt-001/attachment/rec-001')

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/leave a comment/i)).toBeInTheDocument()
        })

        await user.type(screen.getByPlaceholderText(/leave a comment/i), 'Worked great!')
        await user.click(screen.getByRole('button', { name: /submit/i }))

        await waitFor(() => {
            expect(mockReact).toHaveBeenCalledWith('apt-001', 'rec-001', {
                comment: 'Worked great!',
            })
        })

        // After submit, the second fetch resolves and the comment is shown read-only
        await waitFor(() => {
            expect(screen.getByText('Worked great!')).toBeInTheDocument()
        })
    })

    it('renders psychologistReply read-only when present', async () => {
        mockGetByIdForClient.mockResolvedValue({
            data: {
                attachment: baseRecommendation,
                reaction: {
                    attachmentId: 'rec-001',
                    done: true,
                    clientComment: 'Worked',
                    psychologistReply: 'Great progress!',
                    updatedAt: '2026-04-02T09:00:00.000Z',
                },
            },
        })

        renderRoute('/client/appointments/apt-001/attachment/rec-001')

        await waitFor(() => {
            expect(screen.getByText("Psychologist's reply")).toBeInTheDocument()
        })
        expect(screen.getByText('Great progress!')).toBeInTheDocument()
        // No comment textarea once a comment is set
        expect(screen.queryByPlaceholderText(/leave a comment/i)).not.toBeInTheDocument()
    })
})
