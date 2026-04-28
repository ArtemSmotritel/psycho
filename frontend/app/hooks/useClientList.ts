import { useEffect, useState } from 'react'
import { clientService } from '~/services/client.service'
import type { ClientSummary } from '~/models/client'

export function useClientList(): ClientSummary[] {
    const [clients, setClients] = useState<ClientSummary[]>([])

    useEffect(() => {
        clientService
            .getList()
            .then((res) => {
                setClients(res.data.clients)
            })
            .catch(() => {
                setClients([])
            })
    }, [])

    return clients
}
