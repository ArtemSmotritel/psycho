import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppPageHeader } from '~/components/AppPageHeader'
import { EmptyMessage } from '~/components/EmptyMessage'
import { RecommendationCard } from '~/components/RecommendationCard'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { dashboardService } from '~/services/dashboard.service'
import { recommendationService } from '~/services/recommendation.service'
import type { ClientDashboardData } from '~/models/dashboard'

export default function ClientDashboard() {
    useRoleGuard(['client'])

    const [data, setData] = useState<ClientDashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboard = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await dashboardService.getClientDashboard()
            setData(res.data)
        } catch {
            setError('Failed to load dashboard data.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboard()
    }, [])

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <AppPageHeader text="Dashboard" />
                <p>Loading...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-4">
                <AppPageHeader text="Dashboard" />
                <p className="text-destructive">{error}</p>
            </div>
        )
    }

    const { nextAppointment, pendingRecommendations, appointmentCounts } = data!

    const handleToggleDoneForRec =
        (appointmentId: string) => async (attachmentId: string, done: boolean) => {
            try {
                await recommendationService.react(appointmentId, attachmentId, { done })
                await fetchDashboard()
            } catch {
                toast.error('Failed to update recommendation. Please try again.')
            }
        }

    const handleSubmitCommentForRec =
        (appointmentId: string) => async (attachmentId: string, comment: string) => {
            try {
                await recommendationService.react(appointmentId, attachmentId, { comment })
                await fetchDashboard()
            } catch {
                toast.error('Failed to submit comment. Please try again.')
            }
        }

    return (
        <div className="container mx-auto p-4">
            <AppPageHeader text="Dashboard" />

            <div className="grid grid-cols-1 gap-4 mb-8">
                {/* Next Appointment */}
                <Card>
                    <CardHeader>
                        <CardTitle>Next Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextAppointment === null ? (
                            <EmptyMessage title="No upcoming appointments" />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(nextAppointment.startTime), 'PPp')} —{' '}
                                    {format(new Date(nextAppointment.endTime), 'p')}
                                </p>
                                <p className="font-medium">{nextAppointment.psychoName}</p>
                                <p className="text-sm capitalize">{nextAppointment.status}</p>
                                <div className="flex gap-2">
                                    <Link
                                        to={`/client/appointments/${nextAppointment.id}`}
                                        className="text-sm underline"
                                    >
                                        View appointment
                                    </Link>
                                    {nextAppointment.status === 'active' && (
                                        <Link
                                            to={`/client/appointments/${nextAppointment.id}/live`}
                                            className="text-sm font-semibold underline"
                                        >
                                            Join Now
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Recommendations */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pendingRecommendations.length === 0 ? (
                            <EmptyMessage title="No pending recommendations" />
                        ) : (
                            <div className="space-y-3">
                                {pendingRecommendations.map((rec) => (
                                    <RecommendationCard
                                        key={rec.id}
                                        recommendation={rec}
                                        role="client"
                                        onToggleDone={handleToggleDoneForRec(rec.appointmentId)}
                                        onSubmitComment={handleSubmitCommentForRec(
                                            rec.appointmentId,
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Appointments Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appointments Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 mb-4">
                            <p className="text-sm">
                                <span className="font-medium">Upcoming:</span>{' '}
                                {appointmentCounts.upcoming}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Active:</span>{' '}
                                {appointmentCounts.active}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Past:</span> {appointmentCounts.past}
                            </p>
                        </div>
                        <Link to="/client/appointments" className="text-sm underline">
                            View all appointments
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
