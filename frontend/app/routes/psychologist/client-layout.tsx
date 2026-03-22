import { Outlet } from 'react-router'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { useCurrentClient } from '~/hooks/useCurrentClient'

export default function ClientLayout() {
    const client = useCurrentClient()

    return (
        <PageContainer className="w-full h-full flex flex-col">
            <AppPageHeader
                text={`Profile: ${client?.name}`}
                linkTo={`/psycho/clients/${client?.id}`}
            />
            <div className="flex-1 min-h-0 flex flex-col">
                <Outlet />
            </div>
        </PageContainer>
    )
}
