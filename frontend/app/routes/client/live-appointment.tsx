import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Video, PanelRightOpen, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '~/components/ui/sheet'
import { AppPageHeader } from '~/components/AppPageHeader'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { appointmentService } from '~/services/appointment.service'
import { impressionService } from '~/services/impression.service'
import type { AppointmentWithPsycho } from '~/models/appointment'
import type { Attachment } from '~/models/attachment'
import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { WhiteboardCursorOverlay } from '~/components/WhiteboardCursorOverlay'
import { ImpressionForm } from '~/components/ImpressionForm'
import { ImpressionList } from '~/components/ImpressionList'
import { toast } from 'sonner'

const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
)

export default function LiveAppointment() {
    useRoleGuard(['client'])

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
    const [isSubmittingImpression, setIsSubmittingImpression] = useState(false)

    // Initial fetch
    useEffect(() => {
        if (!appointmentId) {
            setAppointment(null)
            setIsLoading(false)
            return
        }

        appointmentService
            .getClientAppointmentById(appointmentId)
            .then((res) => {
                setAppointment(res.data.appointment)
            })
            .catch(() => {
                setAppointment(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [appointmentId])

    // Fetch impressions on mount
    useEffect(() => {
        if (!appointmentId) return
        setIsLoadingImpressions(true)
        impressionService
            .getClientList(appointmentId)
            .then((res) => {
                setImpressions(res.data.impressions)
            })
            .catch(() => {
                // Silently ignore
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
                .getClientAppointmentById(appointmentId!)
                .then((res) => {
                    const updated = res.data.appointment
                    if (updated.status === 'past') {
                        clearInterval(interval)
                        setAppointment(updated)
                        setShowEndedModal(true)
                    }
                })
                .catch(() => {
                    // Silently ignore polling errors
                })
        }, 5000)

        return () => clearInterval(interval)
    }, [appointment?.status, appointmentId])

    // Auto-dismiss effect
    useEffect(() => {
        if (!showEndedModal) return

        const timeout = setTimeout(() => {
            navigate(`/client/appointments/${appointmentId}`)
        }, 5000)

        return () => clearTimeout(timeout)
    }, [showEndedModal, appointmentId, navigate])

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment || (appointment.status !== 'active' && !showEndedModal)) {
        return (
            <div>
                <p>No active appointment found.</p>
                <Link to={`/client/appointments/${appointmentId}`}>Back to appointment</Link>
            </div>
        )
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const formattedStart = format(new Date(appointment.startTime), 'HH:mm')
    const formattedEnd = format(new Date(appointment.endTime), 'HH:mm')

    return (
        <div className="flex flex-col w-full h-full p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 shrink-0">
                <div className="flex items-center gap-4">
                    <AppPageHeader
                        text="Live Session"
                        linkTo={`/client/appointments/${appointmentId}`}
                        className="mb-0"
                    />
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {formattedDate} &middot; {formattedStart} – {formattedEnd}
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
                                    My Impressions
                                </div>
                            </SheetTitle>
                            <SheetDescription>
                                Share your thoughts and impressions during the session.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="px-4 space-y-4">
                            <ImpressionForm
                                isSubmitting={isSubmittingImpression}
                                onSubmit={async (text) => {
                                    if (!appointmentId) return
                                    setIsSubmittingImpression(true)
                                    try {
                                        const res = await impressionService.submit(appointmentId, {
                                            text,
                                        })
                                        setImpressions((prev) => [...prev, res.data.impression])
                                    } catch {
                                        toast.error(
                                            'Failed to submit impression. Please try again.',
                                        )
                                    } finally {
                                        setIsSubmittingImpression(false)
                                    }
                                }}
                            />
                            <ImpressionList
                                impressions={impressions}
                                isLoading={isLoadingImpressions}
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

            <Dialog open={showEndedModal} onOpenChange={() => {}}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Session Ended</DialogTitle>
                        <DialogDescription>
                            Your psychologist has ended the session.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => navigate(`/client/appointments/${appointmentId}`)}>
                            Go to summary
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
