import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Video, LogIn } from 'lucide-react'
import { format } from 'date-fns'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { appointmentService } from '~/services/appointment.service'
import type { AppointmentWithPsycho } from '~/models/appointment'
import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { WhiteboardCursorOverlay } from '~/components/WhiteboardCursorOverlay'

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
        <div className="w-full h-full">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-1">{formattedDate}</h2>
                <p className="text-muted-foreground">
                    {formattedStart} – {formattedEnd}
                </p>
            </div>

            <Alert className="mb-4">
                <Video className="text-primary" />
                <AlertTitle>Google Meet</AlertTitle>
                <AlertDescription>
                    {appointment.googleMeetLink ? (
                        <Link
                            to={appointment.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary underline"
                        >
                            {appointment.googleMeetLink}
                        </Link>
                    ) : (
                        <p className="text-sm text-muted-foreground">No Google Meet link</p>
                    )}
                </AlertDescription>
            </Alert>

            {appointment.googleMeetLink && (
                <ActionsSection title="Actions">
                    <ActionItem
                        icon={<LogIn className="h-6" />}
                        label="Join Call"
                        href={appointment.googleMeetLink}
                    />
                </ActionsSection>
            )}

            <div style={{ position: 'relative' }}>
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                        </div>
                    }
                >
                    <div className="w-full h-full border border-gray-300">
                        <Excalidraw
                            excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
                                setExcalidrawAPI(api)
                                setExcalidrawAPIInstance(api)
                            }}
                            theme="light"
                            zenModeEnabled={true}
                            gridModeEnabled={true}
                            onChange={onWhiteboardChange}
                            onPointerUpdate={onPointerUpdate}
                            UIOptions={{
                                canvasActions: {
                                    saveToActiveFile: false,
                                    loadScene: false,
                                    export: false,
                                    toggleTheme: false,
                                    clearCanvas: false,
                                },
                            }}
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
