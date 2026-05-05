import { api } from './api'
import type { ClientPsychologist } from '~/models/dashboard'
import type { ProgressSession } from '~/models/progress'

export const progressService = {
    getPsychologistsForClient: () =>
        api.get<{ psychologists: ClientPsychologist[] }>('/client/progress/psychologists'),

    getProgressForClient: (psychoId: string) =>
        api.get<{ sessions: ProgressSession[] }>(`/client/progress/${psychoId}`),
}
