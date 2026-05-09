import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Video, PanelRightOpen, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Button } from '~/components/ui/button'
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '~/components/ui/sheet'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { Loading } from '~/components/common/Loading'
import { PageContainer } from '~/components/common/PageContainer'
import { appointmentService } from '~/services/appointment.service'
import { attachmentService, getCreateAttachmentErrorMessage } from '~/services/attachment.service'
import { ATTACHMENT_LIMITS } from '~/lib/attachment-limits'
import type { AppointmentWithPsycho } from '~/models/appointment'
import type { Attachment } from '~/models/attachment'
import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { WhiteboardCursorOverlay } from '~/components/WhiteboardCursorOverlay'
import { AttachmentForm, type AttachmentFormSubmitValues } from '~/components/AttachmentForm'
import { resolveAttachmentFileIds } from '~/services/file.service'
import { routes } from '~/lib/routes'
import { formatAppointmentTimeRange } from '~/utils/utils'
import { AttachmentList } from '~/components/AttachmentList'
import { AttachmentListItem } from '~/components/AttachmentListItem'
import { PostSessionImpressionDialog } from '~/components/PostSessionImpressionDialog'
import { toast } from 'sonner'
import { logIfNotProd } from '~/utils/logger'

const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
)

export default function LiveAppointment() {
    const { appointmentId } = useParams<{ appointmentId: string }>()
    const navigate = useNavigate()

    const [appointment, setAppointment] = useState<AppointmentWithPsycho | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showEndedModal, setShowEndedModal] = useState(false)
    const [excalidrawAPIInstance, setExcalidrawAPIInstance] =
        useState<ExcalidrawImperativeAPI | null>(null)
    const { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors } =
        useWhiteboardSync(appointmentId!)

    const handleExcalidrawAPI = useCallback(
        (api: ExcalidrawImperativeAPI) => {
            setExcalidrawAPI(api)
            setExcalidrawAPIInstance(api)
        },
        [setExcalidrawAPI],
    )

    const excalidrawUIOptions = useMemo(
        () => ({
            canvasActions: {
                saveToActiveFile: false,
                loadScene: false,
                export: false as const,
                toggleTheme: false,
                clearCanvas: false,
            },
        }),
        [],
    )
    const [impressions, setImpressions] = useState<Attachment[]>([])
    const [isLoadingImpressions, setIsLoadingImpressions] = useState(false)

    const handleCreateImpression = async (values: AttachmentFormSubmitValues) => {
        if (!appointmentId) return
        try {
            const { audioFileIds, imageFileIds } = await resolveAttachmentFileIds(values)

            const res = await attachmentService.createForClient(appointmentId, {
                type: 'impression',
                name: values.name,
                text: values.text,
                imageFileIds,
                audioFileIds,
            })
            setImpressions((prev) => [...prev, res.data.attachment])
        } catch (err) {
            toast.error(
                getCreateAttachmentErrorMessage(
                    err,
                    'Failed to submit impression. Please try again.',
                ),
            )
        }
    }

    // Initial fetch
    useEffect(() => {
        if (!appointmentId) {
            setAppointment(null)
            setIsLoading(false)
            return
        }

        appointmentService
            .getByIdForClient(appointmentId)
            .then((res) => {
                setAppointment(res.data.appointment)
            })
            .catch((err) => {
                logIfNotProd('[live-appointment] failed to load appointment', err)
                setAppointment(null)
                toast.error('Failed to load appointment.')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [appointmentId])

    // Fetch impressions on mount
    useEffect(() => {
        if (!appointmentId) return
        setIsLoadingImpressions(true)
        attachmentService
            .listForClient(appointmentId, 'impression')
            .then((res) => {
                setImpressions(res.data.impressions)
            })
            .catch((err) => {
                logIfNotProd('[live-appointment] failed to load impressions', err)
                toast.error('Failed to load impressions.')
            })
            .finally(() => {
                setIsLoadingImpressions(false)
            })
    }, [appointmentId])

    // Polling effect — only runs while appointment is active
    useEffect(() => {
        if (appointment?.status !== 'active') return

        const interval = setInterval(() => {
            appointmentService
                .getByIdForClient(appointmentId!)
                .then((res) => {
                    const updated = res.data.appointment
                    if (updated.status === 'past') {
                        clearInterval(interval)
                        setAppointment(updated)
                        setShowEndedModal(true)
                    }
                })
                .catch(() => {
                    // Polling errors are intentionally silent until the
                    // reconnect-banner UX lands. A 401 here is still picked
                    // up by the global axios interceptor in services/api.ts.
                })
        }, 5000)

        return () => clearInterval(interval)
    }, [appointment?.status, appointmentId])

    if (isLoading) {
        return (
            <PageContainer>
                <AppPageHeader
                    text="Live Session"
                    linkTo={appointmentId ? routes.client.appointment(appointmentId) : undefined}
                />
                <Loading text="Loading appointment..." />
            </PageContainer>
        )
    }

    if (!appointment || (appointment.status !== 'active' && !showEndedModal)) {
        return (
            <PageContainer>
                <AppPageHeader
                    text="Live Session"
                    linkTo={appointmentId ? routes.client.appointment(appointmentId) : undefined}
                />
                <div className="space-y-4">
                    <p>No active appointment found.</p>
                    <Link to={routes.client.appointment(appointmentId!)}>
                        <Button variant="default">Back to appointment</Button>
                    </Link>
                </div>
            </PageContainer>
        )
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const timeRange = formatAppointmentTimeRange(appointment)

    return (
        <PageContainer className="flex flex-col w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 shrink-0">
                <div className="flex items-center gap-4">
                    <AppPageHeader
                        text="Live Session"
                        linkTo={routes.client.appointment(appointmentId!)}
                        className="mb-0"
                    />
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {formattedDate} &middot; {timeRange}
                        </p>
                    </div>
                    {appointment.googleMeetLink && (
                        <Link
                            to={appointment.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Video className="h-4 w-4" />
                                Join Call
                            </Button>
                        </Link>
                    )}
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon">
                            <PanelRightOpen className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>
                                <div className="flex items-center gap-1.5">
                                    <MessageSquare className="h-4 w-4" />
                                    My Impressions{' '}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {impressions.length}/{ATTACHMENT_LIMITS.impression}
                                    </span>
                                </div>
                            </SheetTitle>
                            <SheetDescription>
                                Share your thoughts and impressions during the session.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="px-4 space-y-4">
                            <AttachmentForm
                                type="impression"
                                mode="create"
                                trigger={
                                    <Button
                                        size="sm"
                                        disabled={
                                            impressions.length >= ATTACHMENT_LIMITS.impression
                                        }
                                        title={
                                            impressions.length >= ATTACHMENT_LIMITS.impression
                                                ? `Maximum ${ATTACHMENT_LIMITS.impression} impressions per appointment reached.`
                                                : undefined
                                        }
                                    >
                                        Add Impression
                                    </Button>
                                }
                                onSubmit={handleCreateImpression}
                            />
                            <AttachmentList
                                items={impressions}
                                isLoading={isLoadingImpressions}
                                loadingText="Loading impressions..."
                                emptyMessage="No impressions yet."
                                renderItem={(impression) => (
                                    <AttachmentListItem
                                        attachment={impression}
                                        detailHref={routes.client.attachment(
                                            impression.appointmentId,
                                            impression.id,
                                        )}
                                    />
                                )}
                            />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Whiteboard — fills remaining space */}
            <div className="flex-1 min-h-0 relative border border-border rounded-md">
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        </div>
                    }
                >
                    <div className="w-full h-full">
                        <Excalidraw
                            excalidrawAPI={handleExcalidrawAPI}
                            theme="light"
                            zenModeEnabled={true}
                            gridModeEnabled={true}
                            onChange={onWhiteboardChange}
                            onPointerUpdate={onPointerUpdate}
                            UIOptions={excalidrawUIOptions}
                        />
                    </div>
                </Suspense>
                <WhiteboardCursorOverlay
                    remoteCursors={remoteCursors}
                    excalidrawAPI={excalidrawAPIInstance}
                />
            </div>

            {appointmentId && (
                <PostSessionImpressionDialog
                    open={showEndedModal}
                    appointmentId={appointmentId}
                    onSubmitted={() => navigate(routes.client.appointment(appointmentId))}
                    onSkip={() => navigate(routes.client.appointment(appointmentId))}
                />
            )}
        </PageContainer>
    )
}
