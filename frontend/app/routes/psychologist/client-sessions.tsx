import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router'
import { Clock, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from '@/components/ui/pagination'
import type { Appointment } from '~/models/appointment'
import { appointmentService } from '~/services/appointment.service'
import { EmptyMessage } from '~/components/EmptyMessage'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { format } from 'date-fns'

type ClientSessionsProps = {
    params: {
        clientId: string
    }
}

type AppointmentCardProps = {
    appointment: Appointment
    clientId: string
}

type AppointmentsListProps = {
    title: string
    appointments: Appointment[]
    clientId: string
    oldestFirst: boolean
}

const ITEMS_PER_PAGE = 4

function AppointmentCard({ appointment, clientId }: AppointmentCardProps) {
    useRoleGuard(['psychologist', 'client'])

    return (
        <Link
            to={`/psychologist/clients/${clientId}/appointments/${appointment.id}`}
            className="block"
        >
            <Card className="hover:bg-accent/50 transition-colors max-w-lg">
                <CardHeader className="max-w-lg">
                    <div className="flex sm:items-center sm:flex-row flex-col sm:justify-between items-start">
                        <div className="flex items-center gap-2">
                            {appointment.status === 'past' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <Circle className="h-5 w-5 text-yellow-500" />
                            )}
                            <CardTitle className="text-lg">
                                {format(new Date(appointment.startTime), 'PPP HH:mm')}
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                                {format(new Date(appointment.startTime), 'HH:mm')} –{' '}
                                {format(new Date(appointment.endTime), 'HH:mm')}
                            </span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{appointment.status}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

function AppointmentsList({ title, appointments, clientId, oldestFirst }: AppointmentsListProps) {
    const [currentPage, setCurrentPage] = useState(0)
    const [isAscending, setIsAscending] = useState(oldestFirst)
    const totalPages = Math.max(1, Math.ceil(appointments.length / ITEMS_PER_PAGE))
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    const sortedAppointments = [...appointments].sort((a, b) => {
        const aTime = new Date(a.startTime).getTime()
        const bTime = new Date(b.startTime).getTime()
        return isAscending ? aTime - bTime : bTime - aTime
    })

    const currentAppointments = sortedAppointments.slice(startIndex, endIndex)

    const handleOrderChange = (checked: boolean) => {
        setIsAscending(checked)
        setCurrentPage(0)
    }

    return (
        <div className="w-[450px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold">{title}</h4>
                    <div className="flex items-center gap-2">
                        <Switch
                            id={`appointment-order-${title}`}
                            checked={isAscending}
                            onCheckedChange={handleOrderChange}
                        />
                        <label
                            htmlFor={`appointment-order-${title}`}
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
            <div className="space-y-4 min-h-[300px]">
                {currentAppointments.map((appointment) => (
                    <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        clientId={clientId}
                    />
                ))}
                {appointments.length === 0 && (
                    <EmptyMessage
                        title="No Appointments"
                        description={
                            title === 'Past Appointments'
                                ? 'Completed appointments will appear here'
                                : 'Schedule an appointment to see it here'
                        }
                    />
                )}
            </div>
        </div>
    )
}

export default function ClientSessions({ params }: ClientSessionsProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setIsLoading(true)
        setError(null)
        appointmentService
            .getList(params.clientId)
            .then((res) => {
                setAppointments(res.data.appointments)
            })
            .catch(() => {
                setError('Failed to load appointments.')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [params.clientId])

    if (isLoading) {
        return <p className="text-muted-foreground">Loading appointments...</p>
    }

    if (error) {
        return <p className="text-destructive">{error}</p>
    }

    const pastAppointments = appointments.filter((a) => a.status === 'past')
    const upcomingAppointments = appointments.filter((a) => a.status !== 'past')

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <AppointmentsList
                title="Past Appointments"
                appointments={pastAppointments}
                clientId={params.clientId}
                oldestFirst={false}
            />
            <AppointmentsList
                title="Upcoming Appointments"
                appointments={upcomingAppointments}
                clientId={params.clientId}
                oldestFirst={true}
            />
        </div>
    )
}
