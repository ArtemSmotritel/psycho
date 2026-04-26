import { useEffect, useState } from 'react'
import { clientService } from '~/services/client.service'
import type { Client } from '~/models/client'

export function useClientList(): Client[] {
    const [clients, setClients] = useState<Client[]>([])

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
