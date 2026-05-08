import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionItem } from '@/components/ActionsSection'
import { AttachmentDetail } from '~/components/AttachmentDetail'
import { AppPageHeader } from '~/components/AppPageHeader'
import { PageContainer } from '~/components/PageContainer'
import { useCurrentClientAttachment } from '~/hooks/useCurrentClientAttachment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { routes } from '~/lib/routes'
import { Loading } from '~/components/Loading'

export default function ClientAttachmentDetail() {
    useRoleGuard(['client'])

    const { appointmentId } = useParams<{ appointmentId: string }>()
    const navigate = useNavigate()
    const { attachment, reaction, isLoading, refetch } = useCurrentClientAttachment()

    if (isLoading) {
        return (
            <PageContainer>
                <Loading />
            </PageContainer>
        )
    }

    if (!appointmentId) {
        return (
            <PageContainer>
                <p>Appointment not found.</p>
            </PageContainer>
        )
    }

    if (!attachment) {
        return (
            <PageContainer>
                <p>Attachment not found.</p>
            </PageContainer>
        )
    }

    return (
        <PageContainer>
            <AppPageHeader text="Attachment" linkTo={routes.client.appointment(appointmentId)} />
            <AttachmentDetail
                attachment={attachment}
                reaction={reaction}
                role="client"
                appointmentId={appointmentId}
                onAfterMutation={refetch}
                onAfterDelete={() => navigate(routes.client.appointment(appointmentId))}
                extraActions={
                    <Link to={routes.client.appointment(appointmentId)}>
                        <ActionItem icon={<ArrowRight className="h-6" />} label="Open Session" />
                    </Link>
                }
            />
        </PageContainer>
    )
}
