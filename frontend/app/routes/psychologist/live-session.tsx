import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
    Video,
    LogIn,
    StopCircle,
    PanelRightOpen,
    StickyNote,
    ClipboardList,
    Image as ImageIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { formatAppointmentTimeRange } from '~/utils/utils'
import { routes } from '~/lib/routes'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
// TODO: import exportToBlob lazily to reduce initial bundle size (EDG-47)
import { exportToBlob } from '@excalidraw/excalidraw'
import { Button } from '~/components/ui/button'
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '~/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { ConfirmAction } from '~/components/ConfirmAction'
import { useCurrentAppointment } from '~/hooks/useCurrentAppointment'
import { appointmentService } from '~/services/appointment.service'
import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { WhiteboardCursorOverlay } from '~/components/WhiteboardCursorOverlay'
import { AppointmentNotesPanel } from '~/components/AppointmentNotesPanel'
import { AppointmentRecommendationsPanel } from '~/components/AppointmentRecommendationsPanel'
import { WhiteboardImageInsert } from '~/components/WhiteboardImageInsert'
import { PostSessionFollowUpDialog } from '~/components/PostSessionFollowUpDialog'
import type { Appointment } from '~/models/appointment'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { isPostSessionPromptDone } from '~/utils/post-session-prompt'

const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
)

export default function LiveSession() {
    const { clientId, appointmentId } = useParams<{
        clientId: string
        appointmentId: string
    }>()
    const navigate = useNavigate()
    const { appointment, isLoading } = useCurrentAppointment()

    const [time, setTime] = useState<string>('00:00')
    const [isEnding, setIsEnding] = useState(false)
    const { setExcalidrawAPI, onWhiteboardChange, onPointerUpdate, remoteCursors } =
        useWhiteboardSync(appointmentId!)
    const [excalidrawAPIInstance, setExcalidrawAPIInstance] =
        useState<ExcalidrawImperativeAPI | null>(null)
    const [followUpAppointment, setFollowUpAppointment] = useState<Appointment | null>(null)
    const client = useCurrentClient()
    const appointmentStatus = appointment?.status

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

    useEffect(() => {
        if (appointmentStatus !== 'active' || !appointment) return

        const sessionStart = new Date(appointment.startedAt ?? appointment.startTime).getTime()
        const tick = () => {
            const elapsed = Date.now() - sessionStart
            const hours = Math.floor(elapsed / (1000 * 60 * 60))
            const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
            setTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
        }
        tick()
        const timer = setInterval(tick, 1000)

        return () => clearInterval(timer)
    }, [appointmentStatus, appointment])

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment || appointment.status !== 'active') {
        return (
            <div className="space-y-4">
                <p>No active appointment found.</p>
                <Link to={routes.psycho.appointment(clientId!, appointmentId!)}>
                    <Button variant="default">Back to appointment</Button>
                </Link>
            </div>
        )
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const timeRange = formatAppointmentTimeRange(appointment)

    const handleEndAppointment = async () => {
        setIsEnding(true)
        try {
            let snapshotDataUrl: string | null = null
            if (excalidrawAPIInstance !== null) {
                try {
                    const blob = await exportToBlob({
                        elements: excalidrawAPIInstance.getSceneElements(),
                        files: excalidrawAPIInstance.getFiles(),
                        mimeType: 'image/png',
                    })
                    snapshotDataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result as string)
                        reader.onerror = reject
                        reader.readAsDataURL(blob)
                    })
                } catch {
                    snapshotDataUrl = null
                }
            }
            const { data } = await appointmentService.endForPsycho(
                clientId!,
                appointmentId!,
                snapshotDataUrl,
            )
            toast.success('Appointment ended.')

            const ended = data.appointment
            const hasUpcoming =
                client?.nextAppointment !== null && client?.nextAppointment !== undefined
            const alreadyDone = isPostSessionPromptDone(ended.id)
            if (!hasUpcoming && !alreadyDone) {
                setFollowUpAppointment(ended)
            } else {
                navigate(routes.psycho.appointment(clientId!, appointmentId!))
            }
        } catch {
            toast.error('Failed to end appointment. Please try again.')
        } finally {
            setIsEnding(false)
        }
    }

    const handleFollowUpClose = () => {
        setFollowUpAppointment(null)
        navigate(routes.psycho.appointment(clientId!, appointmentId!))
    }

    return (
        <div className="flex flex-col w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-2 shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-semibold leading-tight">{formattedDate}</h2>
                        <p className="text-sm text-muted-foreground">{timeRange}</p>
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
                <div className="flex items-center gap-3">
                    <span className="text-lg font-mono tabular-nums">{time}</span>
                    <ConfirmAction
                        trigger={
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive gap-1.5"
                                disabled={isEnding}
                            >
                                <StopCircle className="h-4 w-4" />
                                End
                            </Button>
                        }
                        title="End Appointment"
                        description="Are you sure you want to end this appointment? It will be moved to past status."
                        confirmText="End"
                        onConfirm={handleEndAppointment}
                    />
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon">
                                <PanelRightOpen className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle>Session Tools</SheetTitle>
                                <SheetDescription>
                                    Notes, recommendations, and session actions.
                                </SheetDescription>
                            </SheetHeader>
                            <Tabs defaultValue="notes" className="px-4">
                                <TabsList className="w-full">
                                    <TabsTrigger value="notes" className="gap-1.5">
                                        <StickyNote className="h-3.5 w-3.5" />
                                        Notes
                                    </TabsTrigger>
                                    <TabsTrigger value="recommendations" className="gap-1.5">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Recommendations
                                    </TabsTrigger>
                                    <TabsTrigger value="images" className="gap-1.5">
                                        <ImageIcon className="h-3.5 w-3.5" />
                                        Images
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value="notes" className="mt-4">
                                    <AppointmentNotesPanel
                                        clientId={clientId!}
                                        appointmentId={appointmentId!}
                                    />
                                </TabsContent>
                                <TabsContent value="recommendations" className="mt-4">
                                    <AppointmentRecommendationsPanel
                                        clientId={clientId!}
                                        appointmentId={appointmentId!}
                                    />
                                </TabsContent>
                                <TabsContent value="images" className="mt-4">
                                    <WhiteboardImageInsert excalidrawAPI={excalidrawAPIInstance} />
                                </TabsContent>
                            </Tabs>
                        </SheetContent>
                    </Sheet>
                </div>
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
            {followUpAppointment && (
                <PostSessionFollowUpDialog
                    endedAppointment={followUpAppointment}
                    open={true}
                    onClose={handleFollowUpClose}
                />
            )}
        </div>
    )
}
