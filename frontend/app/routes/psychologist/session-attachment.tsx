import { ArrowRight, User } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { Loading } from '~/components/Loading'
import { ActionItem } from '@/components/ActionsSection'
import { AttachmentDetail } from '~/components/AttachmentDetail'
import { useCurrentAttachment } from '~/hooks/useCurrentAttachment'
import { useRoleGuard } from '~/hooks/useRoleGuard'
import { routes } from '~/lib/routes'

export default function SessionAttachment() {
    const { attachment, reaction, isLoading, refetch } = useCurrentAttachment()
    const { clientId, appointmentId } = useParams()
    const navigate = useNavigate()
    useRoleGuard(['psycho'])

    if (isLoading) return <Loading />

    if (!attachment) {
        return <div>Attachment not found</div>
    }

    return (
        <AttachmentDetail
            attachment={attachment}
            reaction={reaction}
            role="psycho"
            appointmentId={appointmentId!}
            clientId={clientId!}
            onAfterMutation={refetch}
            onAfterDelete={() => navigate(routes.psycho.appointment(clientId!, appointmentId!))}
            extraActions={
                <>
                    <Link to={routes.psycho.client(clientId!)}>
                        <ActionItem icon={<User className="h-6" />} label="Open Client Profile" />
                    </Link>
                    <Link to={routes.psycho.appointment(clientId!, appointmentId!)}>
                        <ActionItem icon={<ArrowRight className="h-6" />} label="Open Session" />
                    </Link>
                </>
            }
        />
    )
}
