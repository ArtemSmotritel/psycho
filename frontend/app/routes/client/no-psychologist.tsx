import { EmptyMessage } from '~/components/EmptyMessage'

export default function NoPsychologist() {
    return (
        <div className="flex h-full items-center justify-center py-24">
            <EmptyMessage
                title="Your psychologist will send you an invitation."
                description="Check your email."
            />
        </div>
    )
}
