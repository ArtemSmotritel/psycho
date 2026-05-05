import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { ProtectedRoute } from '~/components/ProtectedRoute'
import { ConfirmDeleteButton } from '~/components/ConfirmDeleteButton'
import { invitationService } from '~/services/invitation.service'
import type { Invitation } from '~/models/invitation'
import { formatAppDate } from '~/utils/utils'

export default function InvitationsPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

    const fetchInvitations = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await invitationService.listForPsycho()
            setInvitations(res.data.invitations)
        } catch {
            setError('Failed to load invitations. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchInvitations()
    }, [fetchInvitations])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return invitations
        return invitations.filter((i) => i.invitedEmail.toLowerCase().includes(q))
    }, [invitations, search])

    async function handleCopyLink(invitation: Invitation) {
        try {
            await navigator.clipboard.writeText(invitation.inviteLink)
            setCopiedId(invitation.id)
            toast.success('Invitation link copied')
            setTimeout(
                () => setCopiedId((current) => (current === invitation.id ? null : current)),
                2000,
            )
        } catch {
            toast.error('Failed to copy link')
        }
    }

    async function handleDelete(id: string) {
        setRowErrors((prev) => {
            const { [id]: _removed, ...rest } = prev
            return rest
        })
        try {
            await invitationService.deleteForPsycho(id)
            toast.success('Invitation deleted')
            await fetchInvitations()
        } catch {
            setRowErrors((prev) => ({ ...prev, [id]: 'Failed to delete invitation.' }))
        }
    }

    return (
        <ProtectedRoute allowedRoles={['psychologist']}>
            <PageContainer>
                <AppPageHeader text="Invitations" />

                <div className="mb-4 flex items-center gap-2">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Loading invitations...
                    </div>
                ) : invitations.length === 0 ? (
                    <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
                        No pending invitations. Invite a client from the Clients page.
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-md border py-12 text-center text-sm text-muted-foreground">
                        No invitations match your search.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Sent</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((invitation) => (
                                    <TableRow key={invitation.id}>
                                        <TableCell className="font-medium">
                                            {invitation.invitedEmail}
                                            {rowErrors[invitation.id] && (
                                                <div className="mt-1 text-xs text-destructive">
                                                    {rowErrors[invitation.id]}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{formatAppDate(invitation.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopyLink(invitation)}
                                                >
                                                    <Copy className="mr-1 h-3.5 w-3.5" />
                                                    {copiedId === invitation.id
                                                        ? 'Copied!'
                                                        : 'Copy Link'}
                                                </Button>
                                                <ConfirmDeleteButton
                                                    itemLabel="invitation"
                                                    title="Delete invitation?"
                                                    description={`This will permanently delete the invitation sent to ${invitation.invitedEmail}. The link will stop working.`}
                                                    onConfirm={() => handleDelete(invitation.id)}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </PageContainer>
        </ProtectedRoute>
    )
}
