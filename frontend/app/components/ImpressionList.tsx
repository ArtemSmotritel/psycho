import { format } from 'date-fns'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import type { Attachment } from '~/models/attachment'

interface ImpressionListProps {
    impressions: Attachment[]
    isLoading: boolean
    clientId?: string
}

export function ImpressionList({ impressions, isLoading, clientId }: ImpressionListProps) {
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
                    {impression.text && <p className="text-sm">{impression.text}</p>}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(impression.createdAt), 'PPP HH:mm')}
                        </p>
                        {clientId && (
                            <Link
                                to={`/psycho/clients/${clientId}/appointments/${impression.appointmentId}/attachment/${impression.id}`}
                            >
                                <Button variant="ghost" size="sm">
                                    Open
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
