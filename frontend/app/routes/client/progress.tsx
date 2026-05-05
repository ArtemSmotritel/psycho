import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { format } from 'date-fns'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { PageContainer } from '~/components/PageContainer'
import { AppPageHeader } from '~/components/AppPageHeader'
import { EmptyMessage } from '~/components/EmptyMessage'
import { progressService } from '~/services/progress.service'
import { cn } from '~/lib/utils'
import { routes } from '~/lib/routes'
import type { ClientPsychologist } from '~/models/dashboard'
import type { ProgressSession } from '~/models/progress'
import type { Attachment, AttachmentWithReaction } from '~/models/attachment'

const COLUMN_WIDTH = 200
const RECS_AREA_HEIGHT = 144
const IMPRESSIONS_AREA_HEIGHT = 144
const DOT_RADIUS = 6
const COLLAPSE_DURATION_MS = 300

function useDelayedUnmount(visible: boolean, durationMs: number): boolean {
    const [mounted, setMounted] = useState(visible)
    useEffect(() => {
        if (visible) {
            setMounted(true)
            return
        }
        const id = setTimeout(() => setMounted(false), durationMs)
        return () => clearTimeout(id)
    }, [visible, durationMs])
    return mounted
}

function attachmentLabel(a: Attachment | AttachmentWithReaction, fallback: string): string {
    if (a.name && a.name.trim().length > 0) return a.name
    if (a.text && a.text.trim().length > 0) {
        const t = a.text.trim()
        return t.length > 36 ? t.slice(0, 36) + '…' : t
    }
    return fallback
}

interface AttachmentNodeProps {
    label: string
    to: string
    direction: 'up' | 'down'
    delayMs: number
    closing: boolean
}

function AttachmentNode({ label, to, direction, delayMs, closing }: AttachmentNodeProps) {
    const enterSlide = direction === 'up' ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
    const exitSlide = direction === 'up' ? 'slide-out-to-bottom-2' : 'slide-out-to-top-2'
    return (
        <Link
            to={to}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'duration-300 max-w-[180px] truncate rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent hover:underline',
                closing
                    ? cn('animate-out fade-out-0', exitSlide)
                    : cn('animate-in fade-in-0', enterSlide),
            )}
            style={{
                animationDelay: `${delayMs}ms`,
                animationFillMode: closing ? 'forwards' : 'backwards',
            }}
            title={label}
        >
            {label}
        </Link>
    )
}

interface SessionColumnProps {
    session: ProgressSession
    expanded: boolean
    onToggle: () => void
    enterDelayMs: number
}

function SessionColumn({ session, expanded, onToggle, enterDelayMs }: SessionColumnProps) {
    const dateStr = format(new Date(session.startTime), 'MMM d, yyyy')
    const recs = session.recommendations
    const imps = session.impressions
    const mounted = useDelayedUnmount(expanded, COLLAPSE_DURATION_MS)
    const closing = mounted && !expanded

    return (
        <div
            className="animate-in fade-in-0 slide-in-from-bottom-4 flex flex-shrink-0 flex-col items-center px-2 duration-500 snap-center"
            style={{
                width: `${COLUMN_WIDTH}px`,
                animationDelay: `${enterDelayMs}ms`,
                animationFillMode: 'backwards',
            }}
        >
            {/* recommendations area (above) */}
            <div
                className="flex w-full flex-col-reverse items-center justify-start gap-2 overflow-hidden"
                style={{ height: `${RECS_AREA_HEIGHT}px` }}
            >
                {mounted && (
                    <>
                        <div
                            className={cn(
                                'h-3 w-px bg-border duration-300',
                                closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0',
                            )}
                            style={{ animationFillMode: closing ? 'forwards' : 'backwards' }}
                        />
                        {recs.length === 0 ? (
                            <span
                                className={cn(
                                    'text-xs italic text-muted-foreground duration-300',
                                    closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0',
                                )}
                                style={{ animationFillMode: closing ? 'forwards' : 'backwards' }}
                            >
                                No recommendations
                            </span>
                        ) : (
                            recs.map((rec, i) => (
                                <AttachmentNode
                                    key={rec.id}
                                    label={attachmentLabel(rec, 'Recommendation')}
                                    to={routes.client.appointment(session.id)}
                                    direction="up"
                                    delayMs={i * 60}
                                    closing={closing}
                                />
                            ))
                        )}
                    </>
                )}
            </div>

            {/* session node */}
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="group flex flex-col items-center gap-2 focus:outline-none"
            >
                <span
                    className={cn(
                        'block rounded-full bg-primary ring-4 ring-background transition-transform group-hover:scale-110',
                        expanded && 'scale-125',
                    )}
                    style={{ width: `${DOT_RADIUS * 2}px`, height: `${DOT_RADIUS * 2}px` }}
                />
                <Link
                    to={routes.client.appointment(session.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        'rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-accent hover:underline',
                        expanded && 'border-primary',
                    )}
                >
                    {dateStr}
                </Link>
            </button>

            {/* impressions area (below) */}
            <div
                className="flex w-full flex-col items-center justify-start gap-2"
                style={{ minHeight: `${IMPRESSIONS_AREA_HEIGHT}px` }}
            >
                {mounted && (
                    <>
                        <div
                            className={cn(
                                'h-3 w-px bg-border duration-300',
                                closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0',
                            )}
                            style={{ animationFillMode: closing ? 'forwards' : 'backwards' }}
                        />
                        {imps.length === 0 ? (
                            <span
                                className={cn(
                                    'text-xs italic text-muted-foreground duration-300',
                                    closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0',
                                )}
                                style={{ animationFillMode: closing ? 'forwards' : 'backwards' }}
                            >
                                No impressions
                            </span>
                        ) : (
                            imps.map((imp, i) => (
                                <AttachmentNode
                                    key={imp.id}
                                    label={attachmentLabel(imp, 'Impression')}
                                    to={routes.client.appointment(session.id)}
                                    direction="down"
                                    delayMs={i * 60}
                                    closing={closing}
                                />
                            ))
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

interface TimelineProps {
    sessions: ProgressSession[]
}

function Timeline({ sessions }: TimelineProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    // Reset expansion when the underlying list changes (e.g., switching psychologists).
    useEffect(() => {
        setExpandedIds(new Set())
    }, [sessions])

    const toggle = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    if (sessions.length === 0) {
        return (
            <EmptyMessage
                title="No completed sessions yet"
                description="Once you complete a session, it will appear here."
            />
        )
    }

    // Center of dot relative to the column = RECS_AREA_HEIGHT + DOT_RADIUS
    const lineTop = RECS_AREA_HEIGHT + DOT_RADIUS

    return (
        <div className="overflow-x-auto pb-6">
            <div className="relative inline-flex snap-x snap-mandatory items-stretch px-4">
                {/* horizontal timeline line, anchored to dot center */}
                <div
                    className="pointer-events-none absolute left-4 right-4 h-0.5 bg-border"
                    style={{ top: `${lineTop - 1}px` }}
                />
                {sessions.map((session, i) => (
                    <SessionColumn
                        key={session.id}
                        session={session}
                        expanded={expandedIds.has(session.id)}
                        onToggle={() => toggle(session.id)}
                        enterDelayMs={i * 70}
                    />
                ))}
            </div>
        </div>
    )
}

export default function ClientProgress() {
    const [psychologists, setPsychologists] = useState<ClientPsychologist[]>([])
    const [selectedPsychoId, setSelectedPsychoId] = useState<string | null>(null)
    const [sessions, setSessions] = useState<ProgressSession[]>([])
    const [isLoadingPsychos, setIsLoadingPsychos] = useState(true)
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setIsLoadingPsychos(true)
        setError(null)
        progressService
            .getPsychologistsForClient()
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
        progressService
            .getProgressForClient(selectedPsychoId)
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

    const sortedSessions = useMemo(
        () =>
            [...sessions].sort(
                (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
            ),
        [sessions],
    )

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
                <Timeline sessions={sortedSessions} />
            )}
        </PageContainer>
    )
}
