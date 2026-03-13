import { Outlet, Link } from 'react-router'
import { AppPageHeader } from '~/components/AppPageHeader'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { useCurrentAppointment } from '~/hooks/useCurrentAppointment'
import { format } from 'date-fns'

export default function ClientLayout() {
    const client = useCurrentClient()
    const { appointment } = useCurrentAppointment()

    return (
        <div className="container mx-auto p-4 w-full h-full">
            <AppPageHeader
                text={`Profile: ${client?.name}`}
                linkTo={`/psycho/clients/${client?.id}`}
                className={appointment ? 'mb-0' : ''}
            />
            {appointment && (
                <h6 className="text-lg font-semibold sm:text-l md:text-xl mb-4 text-gray-500 dark:text-gray-400 mb-8">
                    <Link
                        to={`/psycho/clients/${client?.id}/appointments/${appointment.id}`}
                        className="hover:underline"
                    >
                        {format(new Date(appointment.startTime), 'PPP HH:mm')}
                    </Link>
                </h6>
            )}
            <Outlet />
        </div>
    )
}
