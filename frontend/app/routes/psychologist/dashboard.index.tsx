import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { format } from 'date-fns'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { dashboardService } from '~/services/dashboard.service'
import type { PsychoDashboard } from '~/models/dashboard'

export default function DashboardOverview() {
    const [data, setData] = useState<PsychoDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        dashboardService
            .getDashboardForPsycho()
            .then((res) => {
                setData(res.data)
            })
            .catch(() => {
                setError('Failed to load dashboard. Please try again.')
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

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
                        {format(new Date(data.activeAppointment.startTime), 'PPp')} —{' '}
                        {format(new Date(data.activeAppointment.endTime), 'p')}
                    </p>
                    <Link
                        to={`/psycho/clients/${data.activeAppointment.clientId}/appointments/${data.activeAppointment.id}/live`}
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
                                                {format(new Date(apt.startTime), 'PPp')} —{' '}
                                                {format(new Date(apt.endTime), 'p')}
                                            </p>
                                        </div>
                                        <Link
                                            to={`/psycho/clients/${apt.clientId}/appointments/${apt.id}`}
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
                                            to={`/psycho/clients/${client.id}`}
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
