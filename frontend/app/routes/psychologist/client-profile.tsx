import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Phone,
    MessageSquare,
    Instagram,
    Mail,
    Edit,
    Calendar,
    History,
    TrendingUp,
    ArrowRight,
    ArrowLeft,
    UserMinus,
} from 'lucide-react'
import { toast } from 'sonner'
import { ClientForm } from '@/components/ClientForm'
import { useNavigate, useParams } from 'react-router'
import { SessionForm } from '@/components/SessionForm'
import { ActionsSection, ActionItem } from '@/components/ActionsSection'
import { ConfirmAction } from '~/components/common/ConfirmAction'
import { ContactItem } from '~/components/common/ContactItem'
import { Loading } from '~/components/common/Loading'
import { formatAppDate } from '~/utils/utils'
import { clientService } from '~/services/client.service'
import { useCreateAppointment } from '~/hooks/useCreateAppointment'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { nextSameWeekdayOccurrence } from '~/utils/next-occurrence'
import { routes } from '~/lib/routes'

type ClientProfileProps = {
    params: {
        clientId: string
    }
}

export default function ClientProfile({ params }: ClientProfileProps) {
    const navigate = useNavigate()
    const { role } = useParams<{ role: string }>()
    const { handleCreate: handleAddSession, isCreating: isCreatingAppointment } =
        useCreateAppointment()
    const client = useCurrentClient()

    if (!client) return <Loading />

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} has been copied to your clipboard.`)
    }

    const handleEditClient = async (values: any) => {
        try {
            await clientService.updateForPsycho(client.id, values)
            toast.success('Client updated.')
        } catch {
            toast.error('Failed to update client. Please try again.')
        }
    }

    const handleRemoveClient = async () => {
        try {
            await clientService.deleteForPsycho(client.id)
            navigate(`/${role}/clients`)
        } catch {
            toast.error('Failed to remove client. Please try again.')
        }
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <span className="font-medium">Username:</span>{' '}
                                {client.username ?? '-'}
                            </div>
                            <div>
                                <span className="font-medium">Name:</span> {client.name}
                            </div>
                            <div>
                                <span className="font-medium">Registration Date:</span>{' '}
                                {formatAppDate(client.registrationDate)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ContactItem
                            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
                            label="Phone"
                            value={client.phone}
                            type="phone"
                            onCopy={() => copyToClipboard(client.phone ?? '', 'Phone number')}
                        />

                        <ContactItem
                            icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                            label="Telegram"
                            value={client.telegram}
                            type="telegram"
                            onCopy={() =>
                                copyToClipboard(client.telegram ?? '', 'Telegram username')
                            }
                        />

                        <ContactItem
                            icon={<Instagram className="h-4 w-4 text-muted-foreground" />}
                            label="Instagram"
                            value={client.instagram}
                            type="instagram"
                            onCopy={() =>
                                copyToClipboard(client.instagram ?? '', 'Instagram username')
                            }
                        />

                        <ContactItem
                            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
                            label="Email"
                            value={client.email}
                            type="email"
                            onCopy={() => copyToClipboard(client.email, 'Email address')}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Session Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <span className="font-medium">Total Sessions:</span>{' '}
                                {client.sessionsCount}
                            </div>
                            <div>
                                <span className="font-medium">Last Session:</span>{' '}
                                {client.lastAppointment
                                    ? formatAppDate(client.lastAppointment.startTime)
                                    : '-'}
                            </div>
                            <div>
                                <span className="font-medium">Next Session:</span>{' '}
                                {client.nextAppointment
                                    ? formatAppDate(client.nextAppointment.startTime)
                                    : '-'}
                            </div>
                            <div>
                                <span className="font-medium">Total Impressions:</span>{' '}
                                {client.impressionsCount}
                            </div>
                            <div>
                                <span className="font-medium">Total Recommendations:</span>{' '}
                                {client.recommendationsCount}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ActionsSection title="Actions">
                <ClientForm
                    mode="edit"
                    trigger={<ActionItem icon={<Edit className="h-6 w-6" />} label="Edit client" />}
                    initialData={{
                        username: client.username ?? undefined,
                        name: client.name,
                        email: client.email,
                        phone: client.phone ?? undefined,
                        telegram: client.telegram ?? undefined,
                        instagram: client.instagram ?? undefined,
                    }}
                    onSubmit={handleEditClient}
                />

                <SessionForm
                    mode="add"
                    trigger={
                        <ActionItem
                            icon={<Calendar className="h-6 w-6" />}
                            label="Schedule Session"
                        />
                    }
                    initialData={{
                        clientId: params.clientId,
                        ...(client.lastAppointment
                            ? nextSameWeekdayOccurrence(client.lastAppointment)
                            : {}),
                    }}
                    isLoading={isCreatingAppointment}
                    onSubmit={handleAddSession}
                />

                <ActionItem
                    icon={<TrendingUp className="h-6 w-6" />}
                    label="View Progress"
                    to={routes.psycho.clientProgress(client.id)}
                />

                {client.lastAppointment && (
                    <ActionItem
                        icon={<ArrowLeft className="h-6 w-6" />}
                        label="View Last Session"
                        to={routes.psycho.appointment(client.id, client.lastAppointment.id)}
                        subtext={formatAppDate(client.lastAppointment.startTime)}
                    />
                )}

                <ActionItem
                    icon={<History className="h-6 w-6" />}
                    label="View Session History"
                    to={routes.psycho.clientAppointments(client.id)}
                />

                {client.nextAppointment && (
                    <ActionItem
                        icon={<ArrowRight className="h-6 w-6" />}
                        label="View Next Session"
                        to={routes.psycho.appointment(client.id, client.nextAppointment.id)}
                        subtext={formatAppDate(client.nextAppointment.startTime)}
                    />
                )}

                <ConfirmAction
                    trigger={
                        <ActionItem
                            icon={<UserMinus className="h-6 w-6" />}
                            label="Remove client"
                            variant="destructive"
                        />
                    }
                    title="Remove client"
                    description="This will remove the client from your list. All historical appointments, impressions, and recommendations will be preserved and remain accessible. No new appointments can be created after removal."
                    confirmText="Remove"
                    onConfirm={handleRemoveClient}
                />
            </ActionsSection>
        </>
    )
}
