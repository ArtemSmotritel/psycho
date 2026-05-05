import { useParams } from 'react-router'
import type { Client } from '~/models/client'
import { clientService } from '~/services/client.service'
import { useResource } from './useResource'

export function useCurrentClient(): Client | null {
    const { clientId } = useParams<{ clientId: string }>()

    const { data } = useResource<Client>(
        () => clientService.getByIdForPsycho(clientId!).then((res) => res.data.client),
        [clientId],
        { enabled: !!clientId },
    )

    return data
}
