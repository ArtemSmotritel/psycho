import { Outlet } from 'react-router'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { useCurrentClient } from '~/hooks/useCurrentClient'
import { routes } from '~/lib/routes'

export default function ClientLayout() {
    const client = useCurrentClient()

    return (
        <PageContainer className="w-full h-full flex flex-col">
            <AppPageHeader
                text={`Profile: ${client?.name}`}
                linkTo={routes.psycho.client(client?.id ?? '')}
            />
            <div className="flex-1 min-h-0 flex flex-col">
                <Outlet />
            </div>
        </PageContainer>
    )
}
