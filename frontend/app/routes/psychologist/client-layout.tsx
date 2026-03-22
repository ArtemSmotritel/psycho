import { Outlet } from 'react-router'
import { AppPageHeader } from '~/components/AppPageHeader'
import { useCurrentClient } from '~/hooks/useCurrentClient'

export default function ClientLayout() {
    const client = useCurrentClient()

    return (
        <div className="container mx-auto p-4 w-full h-full flex flex-col">
            <AppPageHeader
                text={`Profile: ${client?.name}`}
                linkTo={`/psycho/clients/${client?.id}`}
            />
            <div className="flex-1 min-h-0 flex flex-col">
                <Outlet />
            </div>
        </div>
    )
}
