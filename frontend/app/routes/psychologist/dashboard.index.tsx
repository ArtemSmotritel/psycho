import { Link } from 'react-router'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { dashboardService } from '~/services/dashboard.service'
import { formatAppointmentDateTimeRange } from '~/utils/utils'
import { routes } from '~/lib/routes'
import { useResource } from '~/hooks/useResource'
import type { PsychoDashboard } from '~/models/dashboard'

export default function DashboardOverview() {
    const {
        data,
        isLoading: loading,
        error,
    } = useResource<PsychoDashboard>(
        () => dashboardService.getDashboardForPsycho().then((res) => res.data),
        [],
        { errorMessage: 'Failed to load dashboard. Please try again.' },
    )

    if (loading) {
        return (
            <PageContainer>
                <AppPageHeader text="Dashboard" />
                <p className="text-muted-foreground">Loading...</p>
            </PageContainer>
        )
    }

    if (error || !data) {
        return (
            <PageContainer>
                <AppPageHeader text="Dashboard" />
                <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
                    {error ?? 'Failed to load dashboard.'}
                </div>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <AppPageHeader text="Dashboard" />

            {data.activeAppointment !== null && (
                <div className="mb-6 rounded-lg border border-primary bg-primary/5 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Appointment</p>
                    <p className="mt-1 text-lg font-semibold">
                        {data.activeAppointment.clientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {formatAppointmentDateTimeRange(data.activeAppointment)}
                    </p>
                    <Link
                        to={routes.psycho.appointmentLive(
                            data.activeAppointment.clientId,
                            data.activeAppointment.id,
                        )}
                        className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2"
                    >
                        Go to appointment
                    </Link>
                </div>
            )}

            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalClients}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalUpcomingAppointments}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Past Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalPastAppointments}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.upcomingAppointments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No upcoming appointments.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {data.upcomingAppointments.map((apt) => (
                                    <li key={apt.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{apt.clientName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatAppointmentDateTimeRange(apt)}
                                            </p>
                                        </div>
                                        <Link
                                            to={routes.psycho.appointment(apt.clientId, apt.id)}
                                            className="text-xs text-primary underline underline-offset-2"
                                        >
                                            View
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Clients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentClients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No clients yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {data.recentClients.map((client) => (
                                    <li
                                        key={client.id}
                                        className="flex items-center justify-between"
                                    >
                                        <p className="text-sm font-medium">{client.name}</p>
                                        <Link
                                            to={routes.psycho.client(client.id)}
                                            className="text-xs text-primary underline underline-offset-2"
                                        >
                                            View profile
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}
