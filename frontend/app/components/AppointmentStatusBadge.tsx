import { Badge } from '~/components/ui/badge'

type AppointmentStatus = 'upcoming' | 'active' | 'past' | 'warning' | 'missed'

const statusConfig: Record<AppointmentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    upcoming: { label: 'Upcoming', variant: 'secondary' },
    active: { label: 'Active', variant: 'default' },
    past: { label: 'Past', variant: 'outline' },
    warning: { label: 'Warning', variant: 'destructive' },
    missed: { label: 'Missed', variant: 'destructive' },
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
    const config = statusConfig[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
}
