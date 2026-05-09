import { EmptyMessage } from '~/components/common/EmptyMessage'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'

export default function NoPsychologist() {
    return (
        <PageContainer>
            <AppPageHeader text="Dashboard" />
            <div className="flex h-full items-center justify-center py-24">
                <EmptyMessage
                    title="Your psychologist will send you an invitation."
                    description="Check your email."
                />
            </div>
        </PageContainer>
    )
}
