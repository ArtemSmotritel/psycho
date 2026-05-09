import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionItem } from '@/components/ActionsSection'
import { AttachmentDetail } from '~/components/attachments/AttachmentDetail'
import { AppPageHeader } from '~/components/common/AppPageHeader'
import { PageContainer } from '~/components/common/PageContainer'
import { useCurrentClientAttachment } from '~/hooks/useCurrentClientAttachment'
import { routes } from '~/lib/routes'
import { Loading } from '~/components/common/Loading'
import { NotFound } from '~/components/common/NotFound'

export default function ClientAttachmentDetail() {
    const { appointmentId } = useParams<{ appointmentId: string }>()
    const navigate = useNavigate()
    const { attachment, reaction, isLoading, refetch } = useCurrentClientAttachment()

    return (
        <PageContainer>
            <AppPageHeader
                text="Attachment"
                linkTo={appointmentId ? routes.client.appointment(appointmentId) : undefined}
            />
            {isLoading ? (
                <Loading />
            ) : !appointmentId ? (
                <NotFound title="Appointment not found." />
            ) : !attachment ? (
                <NotFound title="Attachment not found." />
            ) : (
                <AttachmentDetail
                    attachment={attachment}
                    reaction={reaction}
                    role="client"
                    appointmentId={appointmentId}
                    onAfterMutation={refetch}
                    onAfterDelete={() => navigate(routes.client.appointment(appointmentId))}
                    extraActions={
                        <Link to={routes.client.appointment(appointmentId)}>
                            <ActionItem
                                icon={<ArrowRight className="h-6" />}
                                label="Open Session"
                            />
                        </Link>
                    }
                />
            )}
        </PageContainer>
    )
}
