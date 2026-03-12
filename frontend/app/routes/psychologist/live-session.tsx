import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Video, LogIn, StopCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import '@excalidraw/excalidraw/index.css'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { ActionsSection, ActionItem } from '~/components/ActionsSection'
import { ConfirmAction } from '~/components/ConfirmAction'
import { useCurrentAppointment } from '~/hooks/useCurrentAppointment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { appointmentService } from '~/services/appointment.service'
import { useWhiteboardSync } from '~/hooks/useWhiteboardSync'
import { WhiteboardCursorOverlay } from '~/components/WhiteboardCursorOverlay'

const Excalidraw = lazy(() =>
    import('@excalidraw/excalidraw').then((module) => ({ default: module.Excalidraw })),
)

export default function LiveSession() {
    useRoleGuard(['psychologist'])
    const { role, clientId, appointmentId } = useParams<{
        role: string
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
    const appointmentStatus = appointment?.status

    useEffect(() => {
        if (appointmentStatus !== 'active') return

        const startTime = Date.now()
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime
            const hours = Math.floor(elapsed / (1000 * 60 * 60))
            const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
            setTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`)
        }, 1000)

        return () => clearInterval(timer)
    }, [appointmentStatus])

    if (isLoading) {
        return <p>Loading appointment...</p>
    }

    if (!appointment || appointment.status !== 'active') {
        return (
            <div>
                <p>No active appointment found.</p>
                <Link to={`/${role}/clients/${clientId}/appointments/${appointmentId}`}>
                    Back to appointment
                </Link>
            </div>
        )
    }

    const formattedDate = format(new Date(appointment.startTime), 'PPP')
    const formattedStart = format(new Date(appointment.startTime), 'HH:mm')
    const formattedEnd = format(new Date(appointment.endTime), 'HH:mm')

    const handleEndAppointment = async () => {
        setIsEnding(true)
        try {
            await appointmentService.end(clientId!, appointmentId!)
            toast.success('Appointment ended.')
            navigate(`/${role}/clients/${clientId}/appointments/${appointmentId}`)
        } catch {
            toast.error('Failed to end appointment. Please try again.')
        } finally {
            setIsEnding(false)
        }
    }

    return (
        <div className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-semibold mb-1">{formattedDate}</h2>
                    <p className="text-muted-foreground">
                        {formattedStart} – {formattedEnd}
                    </p>
                </div>
                <div className="text-xl font-mono">{time}</div>
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

            <ActionsSection title="Actions">
                {appointment.googleMeetLink && (
                    <ActionItem
                        icon={<LogIn className="h-6" />}
                        label="Join Call"
                        href={appointment.googleMeetLink}
                    />
                )}
                <ConfirmAction
                    trigger={
                        <ActionItem
                            icon={<StopCircle className="h-6" />}
                            label="End Appointment"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={isEnding}
                        />
                    }
                    title="End Appointment"
                    description="Are you sure you want to end this appointment? It will be moved to past status."
                    confirmText="End"
                    onConfirm={handleEndAppointment}
                />
            </ActionsSection>

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
        </div>
    )
}
