import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Client } from '~/models/client'
import { clientService } from '~/services/client.service'

export function useCurrentClient(): Client | null {
    const { clientId } = useParams<{ clientId: string }>()
    const [client, setClient] = useState<Client | null>(null)

    useEffect(() => {
        if (!clientId) {
            setClient(null)
            return
        }

        clientService
            .getById(clientId)
            .then((res) => {
                setClient(res.data.client)
            })
            .catch(() => {
                setClient(null)
            })
    }, [clientId])

    return client
}
