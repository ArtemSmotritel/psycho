import { clientService } from '~/services/client.service'
import type { ClientSummary } from '~/models/client'
import { useResource } from './useResource'

export function useClientList(): ClientSummary[] {
    const { data } = useResource<ClientSummary[]>(
        () => clientService.getListForPsycho().then((res) => res.data.clients),
        [],
        { initial: [] },
    )

    return data ?? []
}
