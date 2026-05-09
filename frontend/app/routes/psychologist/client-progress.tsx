import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from '@/components/ui/pagination'
import type { AttachmentWithAppointment } from '~/models/attachment'
import { impressionService } from '~/services/impression.service'
import { EmptyMessage } from '~/components/common/EmptyMessage'
import { Loading } from '~/components/common/Loading'
import { formatAppDate, formatAttachmentTitle } from '~/utils/utils'
import { routes } from '~/lib/routes'

type ClientProgressProps = {
    params: {
        clientId: string
    }
}

type AppointmentGroup = {
    appointmentId: string
    appointmentStartTime: string
    impressions: AttachmentWithAppointment[]
}

type AppointmentInTimelineProps = {
    appointmentId: string
    appointmentStartTime: string
    impressions: AttachmentWithAppointment[]
    index: number
    startIndex: number
    clientId: string
    isLast: boolean
}

function AppointmentInTimeline({
    appointmentId,
    appointmentStartTime,
    impressions,
    index,
    startIndex,
    clientId,
    isLast,
}: AppointmentInTimelineProps) {
    return (
        <div className="relative">
            {/* Timeline line */}
            {!isLast && <div className="absolute left-4 top-8 h-full w-0.5 bg-border" />}

            <div className="relative flex gap-4">
                {/* Timeline dot */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Calendar className="h-4 w-4 text-primary-foreground" />
                </div>

                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Link
                            to={routes.psycho.appointment(clientId, appointmentId)}
                            className="text-sm font-medium hover:underline"
                        >
                            Appointment {startIndex + index + 1}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                            {formatAppDate(appointmentStartTime)}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="mb-2 font-medium">Impressions</h3>
                            <ul className="space-y-2">
                                {impressions.map((impression) => (
                                    <li key={impression.id} className="text-sm space-y-0.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs text-muted-foreground">
                                                {formatAppDate(impression.createdAt)}
                                            </span>
                                            <span className="font-medium">
                                                {formatAttachmentTitle(impression)}
                                            </span>
                                        </div>
                                        {impression.text && (
                                            <p className="text-muted-foreground whitespace-pre-wrap">
                                                {impression.text}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

const ITEMS_PER_PAGE = 3

export default function ClientProgress({ params }: ClientProgressProps) {
    const [impressions, setImpressions] = useState<AttachmentWithAppointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const [isAscending, setIsAscending] = useState(true)

    useEffect(() => {
        setIsLoading(true)
        setError(null)
        impressionService
            .getProgressListForPsycho(params.clientId)
            .then((res) => {
                setImpressions(res.data.impressions)
            })
            .catch(() => {
                setError('Failed to load impressions.')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [params.clientId])

    if (isLoading) {
        return <Loading text="Loading impressions..." />
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    // Group impressions by appointment
    const groupMap = new Map<string, AppointmentGroup>()
    for (const impression of impressions) {
        const existing = groupMap.get(impression.appointmentId)
        if (existing) {
            existing.impressions.push(impression)
        } else {
            groupMap.set(impression.appointmentId, {
                appointmentId: impression.appointmentId,
                appointmentStartTime: impression.appointmentStartTime,
                impressions: [impression],
            })
        }
    }

    const groups = Array.from(groupMap.values()).sort((a, b) => {
        const aTime = new Date(a.appointmentStartTime).getTime()
        const bTime = new Date(b.appointmentStartTime).getTime()
        return isAscending ? aTime - bTime : bTime - aTime
    })

    const totalPages = Math.max(1, Math.ceil(groups.length / ITEMS_PER_PAGE))
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentGroups = groups.slice(startIndex, endIndex)

    const handleOrderChange = (checked: boolean) => {
        setIsAscending(checked)
        setCurrentPage(0)
    }

    return (
        <div className="w-[450px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Client Progress</h3>
                    <div className="flex items-center gap-2">
                        <Switch
                            id="appointment-order"
                            checked={isAscending}
                            onCheckedChange={handleOrderChange}
                        />
                        <label
                            htmlFor="appointment-order"
                            className="text-sm text-muted-foreground"
                        >
                            {isAscending ? 'Oldest First' : 'Newest First'}
                        </label>
                    </div>
                </div>
                <Pagination className="justify-end">
                    <PaginationContent>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                                disabled={currentPage === 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink>
                                {currentPage + 1} / {totalPages}
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
                                }
                                disabled={currentPage === totalPages - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
            <div className="mt-6 space-y-8">
                {currentGroups.map((group, index) => {
                    const isLast = index + 1 + ITEMS_PER_PAGE * currentPage >= groups.length
                    return (
                        <AppointmentInTimeline
                            key={group.appointmentId}
                            appointmentId={group.appointmentId}
                            appointmentStartTime={group.appointmentStartTime}
                            impressions={group.impressions}
                            index={index}
                            startIndex={startIndex}
                            clientId={params.clientId}
                            isLast={isLast}
                        />
                    )
                })}
                {groups.length === 0 && (
                    <EmptyMessage
                        title="No impressions yet"
                        description="No impressions have been submitted for any appointment."
                    />
                )}
            </div>
        </div>
    )
}
