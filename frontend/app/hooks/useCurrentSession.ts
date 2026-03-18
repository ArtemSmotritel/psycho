import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Session } from '~/models/session'
import { appointmentService } from '~/services/appointment.service'
import { noteService } from '~/services/note.service'
import { recommendationService } from '~/services/recommendation.service'
import { impressionService } from '~/services/impression.service'

export function useCurrentSession(): { session: Session | null; isLoading: boolean } {
    const { clientId, appointmentId } = useParams<{ clientId: string; appointmentId: string }>()
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!clientId || !appointmentId) {
            setSession(null)
            return
        }

        setIsLoading(true)

        Promise.all([
            appointmentService.getById(clientId, appointmentId),
            noteService.getList(clientId, appointmentId),
            recommendationService.getList(clientId, appointmentId),
            impressionService.getPsychoList(clientId, appointmentId),
        ])
            .then(([apptRes, notesRes, recsRes, impressionsRes]) => {
                setSession({
                    ...apptRes.data.appointment,
                    notes: notesRes.data.notes,
                    recommendations: recsRes.data.recommendations,
                    impressions: impressionsRes.data.impressions,
                })
            })
            .catch(() => {
                setSession(null)
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [clientId, appointmentId])

    return { session, isLoading }
}
