import { EmptyMessage } from '~/components/EmptyMessage'
import { AppPageHeader } from '~/components/AppPageHeader'

export default function NoPsychologist() {
    return (
        <div className="container mx-auto p-4">
            <AppPageHeader text="Dashboard" />
            <div className="flex h-full items-center justify-center py-24">
                <EmptyMessage
                    title="Your psychologist will send you an invitation."
                    description="Check your email."
                />
            </div>
        </div>
    )
}
