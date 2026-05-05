import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import type { Attachment } from '~/models/attachment'
import { formatAppDate, formatAttachmentTitle } from '~/utils/utils'
import { routes } from '~/lib/routes'
import { EmptyMessage } from './EmptyMessage'
import { Loading } from './Loading'

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
        return <Loading text="Loading impressions..." />
    }

    if (impressions.length === 0) {
        return <EmptyMessage title="No impressions yet." />
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
                                    to={routes.psycho.attachment(
                                        clientId,
                                        impression.appointmentId,
                                        impression.id,
                                    )}
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
                                    to={routes.client.attachment(
                                        impression.appointmentId,
                                        impression.id,
                                    )}
                                >
                                    <Button variant="ghost" size="sm">
                                        Open
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {formatAppDate(impression.createdAt)}
                    </p>
                </div>
            ))}
        </div>
    )
}
