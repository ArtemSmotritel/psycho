import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { format } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from '@/components/ui/pagination'
import { PageContainer } from '~/components/PageContainer'
import { AppPageHeader } from '~/components/AppPageHeader'
import { EmptyMessage } from '~/components/EmptyMessage'
import { RecommendationCard } from '~/components/RecommendationCard'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { progressService } from '~/services/progress.service'
import type { ClientPsychologist } from '~/models/dashboard'
import type { ProgressSession } from '~/models/progress'

const ITEMS_PER_PAGE = 3

interface SessionInTimelineProps {
    session: ProgressSession
    displayIndex: number
    isLast: boolean
}

function SessionInTimeline({ session, displayIndex, isLast }: SessionInTimelineProps) {
    return (
        <div className="relative">
            {!isLast && <div className="absolute left-4 top-8 h-full w-0.5 bg-border" />}

            <div className="relative flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                    <Calendar className="h-4 w-4 text-primary-foreground" />
                </div>

                <Card className="flex-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Link
                            to={`/client/appointments/${session.id}`}
                            className="text-sm font-medium hover:underline"
                        >
                            Session {displayIndex}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                            {format(new Date(session.startTime), 'PPP HH:mm')}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="mb-2 font-medium">Impressions</h3>
                            {session.impressions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No impressions submitted for this session.
                                </p>
                            ) : (
                                <ul className="space-y-1">
                                    {session.impressions.map((impression) => (
                                        <li
                                            key={impression.id}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {format(
                                                    new Date(impression.createdAt),
                                                    'PPP HH:mm',
                                                )}
                                            </span>
                                            {impression.text && <span>{impression.text}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <h3 className="mb-2 font-medium">Recommendations</h3>
                            {session.recommendations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No recommendations for this session.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {session.recommendations.map((rec) => (
                                        <RecommendationCard
                                            key={rec.id}
                                            recommendation={rec}
                                            role="client"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function ClientProgress() {
    useRoleGuard(['client'])

    const [psychologists, setPsychologists] = useState<ClientPsychologist[]>([])
    const [selectedPsychoId, setSelectedPsychoId] = useState<string | null>(null)
    const [sessions, setSessions] = useState<ProgressSession[]>([])
    const [isLoadingPsychos, setIsLoadingPsychos] = useState(true)
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const [isAscending, setIsAscending] = useState(true)

    useEffect(() => {
        setIsLoadingPsychos(true)
        setError(null)
        progressService
            .getPsychologists()
            .then((res) => {
                setPsychologists(res.data.psychologists)
                if (res.data.psychologists.length === 1) {
                    setSelectedPsychoId(res.data.psychologists[0].id)
                }
            })
            .catch(() => {
                setError('Failed to load psychologists.')
            })
            .finally(() => {
                setIsLoadingPsychos(false)
            })
    }, [])

    useEffect(() => {
        if (!selectedPsychoId) {
            setSessions([])
            return
        }
        setIsLoadingSessions(true)
        setError(null)
        setCurrentPage(0)
        progressService
            .getProgress(selectedPsychoId)
            .then((res) => {
                setSessions(res.data.sessions)
            })
            .catch(() => {
                setError('Failed to load progress.')
            })
            .finally(() => {
                setIsLoadingSessions(false)
            })
    }, [selectedPsychoId])

    if (isLoadingPsychos) {
        return (
            <PageContainer>
                <AppPageHeader text="Progress" />
                <p>Loading...</p>
            </PageContainer>
        )
    }

    if (error && psychologists.length === 0) {
        return (
            <PageContainer>
                <AppPageHeader text="Progress" />
                <p className="text-destructive">{error}</p>
            </PageContainer>
        )
    }

    if (psychologists.length === 0) {
        return (
            <PageContainer>
                <AppPageHeader text="Progress" />
                <EmptyMessage
                    title="No psychologists linked"
                    description="Link a psychologist to start tracking your progress."
                />
            </PageContainer>
        )
    }

    const sortedSessions = [...sessions].sort((a, b) => {
        const aTime = new Date(a.startTime).getTime()
        const bTime = new Date(b.startTime).getTime()
        return isAscending ? aTime - bTime : bTime - aTime
    })

    const totalPages = Math.max(1, Math.ceil(sortedSessions.length / ITEMS_PER_PAGE))
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const currentSessions = sortedSessions.slice(startIndex, endIndex)

    const handleOrderChange = (checked: boolean) => {
        setIsAscending(checked)
        setCurrentPage(0)
    }

    return (
        <PageContainer>
            <AppPageHeader text="Progress" />

            <div className="mb-6 flex items-center gap-3">
                <label className="text-sm font-medium">Psychologist:</label>
                <Select
                    value={selectedPsychoId ?? ''}
                    onValueChange={(value) => setSelectedPsychoId(value)}
                >
                    <SelectTrigger className="min-w-[240px]">
                        <SelectValue placeholder="Select a psychologist" />
                    </SelectTrigger>
                    <SelectContent>
                        {psychologists.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!selectedPsychoId ? (
                <EmptyMessage title="Select a psychologist to view your progress." />
            ) : isLoadingSessions ? (
                <p className="text-muted-foreground">Loading progress...</p>
            ) : error ? (
                <p className="text-destructive">{error}</p>
            ) : (
                <>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="session-order"
                                checked={isAscending}
                                onCheckedChange={handleOrderChange}
                            />
                            <label
                                htmlFor="session-order"
                                className="text-sm text-muted-foreground"
                            >
                                {isAscending ? 'Oldest First' : 'Newest First'}
                            </label>
                        </div>
                        {sortedSessions.length > ITEMS_PER_PAGE && (
                            <Pagination className="justify-end">
                                <PaginationContent>
                                    <PaginationItem>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                                setCurrentPage((prev) => Math.max(0, prev - 1))
                                            }
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
                                                setCurrentPage((prev) =>
                                                    Math.min(totalPages - 1, prev + 1),
                                                )
                                            }
                                            disabled={currentPage === totalPages - 1}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        )}
                    </div>

                    <div className="mt-6 space-y-8">
                        {currentSessions.map((session, index) => {
                            const absoluteIndex = startIndex + index
                            const isLast = absoluteIndex + 1 >= sortedSessions.length
                            // Session display number follows timeline order (1 = earliest shown first).
                            const displayIndex = isAscending
                                ? absoluteIndex + 1
                                : sortedSessions.length - absoluteIndex
                            return (
                                <SessionInTimeline
                                    key={session.id}
                                    session={session}
                                    displayIndex={displayIndex}
                                    isLast={isLast}
                                />
                            )
                        })}
                        {sortedSessions.length === 0 && (
                            <EmptyMessage
                                title="No sessions yet"
                                description="Your past sessions with this psychologist will appear here."
                            />
                        )}
                    </div>
                </>
            )}
        </PageContainer>
    )
}
