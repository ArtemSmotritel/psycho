import { EmptyMessage } from '~/components/EmptyMessage'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'

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
