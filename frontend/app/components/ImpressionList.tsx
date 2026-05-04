import { format } from 'date-fns'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import type { Attachment } from '~/models/attachment'
import { formatAttachmentTitle } from '~/utils/utils'

interface ImpressionListProps {
    impressions: Attachment[]
    isLoading: boolean
    clientId?: string
    clientLinks?: boolean
}

export function ImpressionList({
    impressions,
    isLoading,
    clientId,
    clientLinks,
}: ImpressionListProps) {
    if (isLoading) {
        return (
            <div data-testid="loading-spinner" className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
            </div>
        )
    }

    if (impressions.length === 0) {
        return <p className="text-muted-foreground text-sm">No impressions yet.</p>
    }

    return (
        <div className="space-y-3">
            {impressions.map((impression) => (
                <div key={impression.id} className="border rounded-md p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">
                                {formatAttachmentTitle(impression)}
                            </p>
                            {impression.text && (
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {impression.text}
                                </p>
                            )}
                        </div>
                        {clientId && (
                            <div className="flex items-center gap-1 shrink-0">
                                <Link
                                    to={`/psycho/clients/${clientId}/appointments/${impression.appointmentId}/attachment/${impression.id}`}
                                >
                                    <Button variant="ghost" size="sm">
                                        Open
                                    </Button>
                                </Link>
                            </div>
                        )}
                        {clientLinks && (
                            <div className="flex items-center gap-1 shrink-0">
                                <Link
                                    to={`/client/appointments/${impression.appointmentId}/attachment/${impression.id}`}
                                >
                                    <Button variant="ghost" size="sm">
                                        Open
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {format(new Date(impression.createdAt), 'PPP HH:mm')}
                    </p>
                </div>
            ))}
        </div>
    )
}
