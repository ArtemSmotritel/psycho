// Generates UML use case diagrams for the Helpsycho app.
// Three diagrams: Psychologist, Client, Guest.
// Style follows the reference: stick figure actor in the middle,
// use cases radiate to BOTH sides; solid arrows for actor associations,
// dashed arrows with «include» / «extend» between use cases.

type AnyEl = Record<string, unknown>

let seedCounter = 1
const nextSeed = () => ++seedCounter

const baseShape = (overrides: AnyEl): AnyEl => ({
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    ...overrides,
})

const baseText = (overrides: AnyEl): AnyEl => ({
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    fontSize: 24,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.25,
    baseline: 26,
    ...overrides,
})

const baseArrow = (overrides: AnyEl): AnyEl => ({
    angle: 0,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    startBinding: null,
    endBinding: null,
    lastCommittedPoint: null,
    startArrowhead: null,
    endArrowhead: null,
    ...overrides,
})

interface UseCase {
    id: string
    label: string
    x: number
    y: number
    w?: number
    h?: number
    primary?: boolean
}

const UC_W = 280
const UC_H = 130

function makeUseCase(uc: UseCase): AnyEl[] {
    const w = uc.w ?? UC_W
    const h = uc.h ?? UC_H
    const textId = `${uc.id}-text`
    const shape = baseShape({
        id: uc.id,
        type: 'ellipse',
        x: uc.x,
        y: uc.y,
        width: w,
        height: h,
        strokeColor: '#1e1e1e',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 1.5,
        boundElements: [{ type: 'text', id: textId }],
    })
    const text = baseText({
        id: textId,
        type: 'text',
        x: uc.x,
        y: uc.y + h / 2 - 30,
        width: w,
        height: 60,
        text: uc.label,
        originalText: uc.label,
        containerId: uc.id,
        fontSize: 24,
    })
    return [shape, text]
}

function makeActor(id: string, label: string, x: number, y: number): AnyEl[] {
    const head = baseShape({
        id: `${id}-head`,
        type: 'ellipse',
        x: x + 30,
        y: y,
        width: 50,
        height: 50,
        strokeColor: '#1e1e1e',
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
    })
    const body = baseShape({
        id: `${id}-body`,
        type: 'line',
        x: x + 55,
        y: y + 50,
        width: 0,
        height: 65,
        points: [
            [0, 0],
            [0, 65],
        ],
        strokeColor: '#1e1e1e',
        strokeWidth: 2,
    })
    const arms = baseShape({
        id: `${id}-arms`,
        type: 'line',
        x: x + 15,
        y: y + 75,
        width: 80,
        height: 0,
        points: [
            [0, 0],
            [80, 0],
        ],
        strokeColor: '#1e1e1e',
        strokeWidth: 2,
    })
    const legL = baseShape({
        id: `${id}-legL`,
        type: 'line',
        x: x + 55,
        y: y + 115,
        width: 25,
        height: 45,
        points: [
            [0, 0],
            [-25, 45],
        ],
        strokeColor: '#1e1e1e',
        strokeWidth: 2,
    })
    const legR = baseShape({
        id: `${id}-legR`,
        type: 'line',
        x: x + 55,
        y: y + 115,
        width: 25,
        height: 45,
        points: [
            [0, 0],
            [25, 45],
        ],
        strokeColor: '#1e1e1e',
        strokeWidth: 2,
    })
    const labelEl = baseText({
        id: `${id}-label`,
        type: 'text',
        x: x - 45,
        y: y + 170,
        width: 200,
        height: 34,
        text: label,
        originalText: label,
        fontSize: 24,
        textAlign: 'center',
        verticalAlign: 'top',
        containerId: null,
    })
    return [head, body, arms, legL, legR, labelEl]
}

function ellipseEdgePoint(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    targetX: number,
    targetY: number,
): { x: number; y: number } {
    const dx = targetX - cx
    const dy = targetY - cy
    const angle = Math.atan2(dy, dx)
    return {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
    }
}

// Solid line (with small arrowhead on UC end) from actor to use case
function makeAssociation(
    actor: { x: number; y: number },
    uc: { x: number; y: number; w?: number; h?: number },
    id: string,
): AnyEl {
    const w = uc.w ?? UC_W
    const h = uc.h ?? UC_H
    // Actor reference point: center of body (approx x+55, y+85)
    const aX = actor.x + 55
    const aY = actor.y + 85
    // UC center
    const cx = uc.x + w / 2
    const cy = uc.y + h / 2
    const edge = ellipseEdgePoint(cx, cy, w / 2, h / 2, aX, aY)
    return baseArrow({
        id,
        type: 'arrow',
        x: aX,
        y: aY,
        width: edge.x - aX,
        height: edge.y - aY,
        points: [
            [0, 0],
            [edge.x - aX, edge.y - aY],
        ],
        strokeColor: '#1e1e1e',
        strokeWidth: 1.5,
        endArrowhead: 'arrow',
    })
}

// Dashed «include» / «extend» between use cases.
// Per UML:
//   INCLUDE: base ---<<include>>--> included (arrow ends at included UC)
//   EXTEND : extension ---<<extend>>--> base (arrow ends at base UC)
function makeRelationship(
    from: { x: number; y: number; w?: number; h?: number },
    to: { x: number; y: number; w?: number; h?: number },
    id: string,
    kind: 'include' | 'extend',
): AnyEl[] {
    const fw = from.w ?? UC_W
    const fh = from.h ?? UC_H
    const tw = to.w ?? UC_W
    const th = to.h ?? UC_H
    const fcx = from.x + fw / 2
    const fcy = from.y + fh / 2
    const tcx = to.x + tw / 2
    const tcy = to.y + th / 2
    const start = ellipseEdgePoint(fcx, fcy, fw / 2, fh / 2, tcx, tcy)
    const end = ellipseEdgePoint(tcx, tcy, tw / 2, th / 2, fcx, fcy)

    const arrow = baseArrow({
        id,
        type: 'arrow',
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
        points: [
            [0, 0],
            [end.x - start.x, end.y - start.y],
        ],
        strokeColor: '#1e1e1e',
        strokeStyle: 'dashed',
        strokeWidth: 1.5,
        endArrowhead: 'triangle',
    })

    const label = `«${kind}»`
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const labelEl = baseText({
        id: `${id}-label`,
        type: 'text',
        x: midX - 60,
        y: midY - 16,
        width: 120,
        height: 32,
        text: label,
        originalText: label,
        fontSize: 20,
        strokeColor: '#1e1e1e',
        backgroundColor: '#ffffff',
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: null,
    })
    return [arrow, labelEl]
}

interface DiagramSpec {
    title: string
    actors: { id: string; label: string; x: number; y: number }[]
    useCases: UseCase[]
    associations: { actor: string; uc: string }[]
    relations: { from: string; to: string; kind: 'include' | 'extend' }[]
}

function buildDiagram(spec: DiagramSpec): AnyEl {
    seedCounter = 1
    const elements: AnyEl[] = []

    elements.push(
        baseText({
            id: 'diagram-title',
            type: 'text',
            x: 40,
            y: 20,
            width: 2200,
            height: 48,
            text: spec.title,
            originalText: spec.title,
            fontSize: 32,
            textAlign: 'left',
            verticalAlign: 'top',
            containerId: null,
        }),
    )

    const ucMap = new Map<string, UseCase>()
    for (const uc of spec.useCases) {
        ucMap.set(uc.id, uc)
        elements.push(...makeUseCase(uc))
    }

    const actorMap = new Map<string, { x: number; y: number }>()
    for (const a of spec.actors) {
        actorMap.set(a.id, { x: a.x, y: a.y })
        elements.push(...makeActor(a.id, a.label, a.x, a.y))
    }

    let assocCount = 0
    for (const assoc of spec.associations) {
        const actor = actorMap.get(assoc.actor)
        const uc = ucMap.get(assoc.uc)
        if (!actor || !uc) continue
        elements.push(makeAssociation(actor, uc, `assoc-${assocCount++}`))
    }

    let relCount = 0
    for (const rel of spec.relations) {
        const from = ucMap.get(rel.from)
        const to = ucMap.get(rel.to)
        if (!from || !to) continue
        elements.push(...makeRelationship(from, to, `rel-${relCount++}`, rel.kind))
    }

    return {
        type: 'excalidraw',
        version: 2,
        source: 'https://excalidraw.com',
        elements,
        appState: {
            gridSize: 20,
            gridStep: 5,
            gridModeEnabled: false,
            viewBackgroundColor: '#ffffff',
        },
        files: {},
    }
}

// ============================================================
// PSYCHOLOGIST
// ============================================================

function buildPsychologist(): AnyEl {
    // Columns laid out around the actor.
    const LEFT_SUB2 = 40
    const LEFT_SUB1 = 360
    const LEFT_PRIM = 700
    const ACTOR_X = 1060
    const RIGHT_PRIM = 1380
    const RIGHT_SUB1 = 1740
    const RIGHT_SUB2 = 2080

    const useCases: UseCase[] = [
        // ==== LEFT SIDE ====
        // Account
        { id: 'p-signin', label: 'Sign in with\nGoogle', x: LEFT_PRIM, y: 100 },
        { id: 'p-select-role', label: 'Select active\nrole', x: LEFT_SUB1, y: 100 },
        { id: 'p-switch-role', label: 'Switch active\nrole', x: LEFT_PRIM, y: 260 },
        { id: 'p-profile', label: 'Manage own\nprofile', x: LEFT_PRIM, y: 420 },

        // Dashboard
        { id: 'p-dashboard', label: 'View dashboard', x: LEFT_PRIM, y: 580 },
        { id: 'p-active-appt', label: 'See active\nappointment', x: LEFT_SUB1, y: 520 },
        { id: 'p-upcoming', label: 'See upcoming\nappointments', x: LEFT_SUB1, y: 680 },

        // Clients
        { id: 'p-client-list', label: 'View client list', x: LEFT_PRIM, y: 840 },
        { id: 'p-view-client', label: 'View client\nprofile', x: LEFT_SUB1, y: 840 },
        { id: 'p-update-client', label: 'Update client\ninfo', x: LEFT_SUB2, y: 840 },
        { id: 'p-add-client', label: 'Link existing\nclient by email', x: LEFT_PRIM, y: 1000 },
        { id: 'p-unlink', label: 'Unlink client', x: LEFT_PRIM, y: 1160 },

        // Invitations
        { id: 'p-invite-send', label: 'Invite new user\nby email', x: LEFT_PRIM, y: 1320 },
        { id: 'p-invite-link', label: 'Generate invite\nlink', x: LEFT_SUB1, y: 1320 },
        { id: 'p-invite-list', label: 'View pending\ninvitations', x: LEFT_PRIM, y: 1480 },
        { id: 'p-invite-cancel', label: 'Cancel invitation', x: LEFT_PRIM, y: 1640 },

        // Appointments
        { id: 'p-schedule', label: 'Schedule\nappointment', x: LEFT_PRIM, y: 1800 },
        { id: 'p-meet-create', label: 'Generate Google\nMeet link', x: LEFT_SUB1, y: 1760 },
        { id: 'p-cal-create', label: 'Create Google\nCalendar event', x: LEFT_SUB1, y: 1920 },

        { id: 'p-reschedule', label: 'Reschedule\nappointment', x: LEFT_PRIM, y: 2080 },
        { id: 'p-cal-update', label: 'Update Google\nCalendar event', x: LEFT_SUB1, y: 2080 },

        { id: 'p-cancel-appt', label: 'Cancel\nappointment', x: LEFT_PRIM, y: 2240 },
        { id: 'p-cal-delete', label: 'Delete Google\nCalendar event', x: LEFT_SUB1, y: 2240 },

        { id: 'p-list-appts', label: 'View appointment\nlist', x: LEFT_PRIM, y: 2400 },
        { id: 'p-view-appt', label: 'View appointment\ndetails', x: LEFT_PRIM, y: 2560 },

        // ==== RIGHT SIDE ====
        // Live Session
        { id: 'p-start', label: 'Start appointment', x: RIGHT_PRIM, y: 100 },
        { id: 'p-conduct', label: 'Conduct live\nsession', x: RIGHT_PRIM, y: 260 },
        { id: 'p-whiteboard', label: 'Collaborate on\nwhiteboard', x: RIGHT_SUB1, y: 200 },
        { id: 'p-take-notes', label: 'Take session\nnotes', x: RIGHT_SUB1, y: 360 },
        { id: 'p-attach-files', label: 'Attach images\n/ audio', x: RIGHT_SUB2, y: 360 },
        { id: 'p-live-impressions', label: 'View live\nimpressions', x: RIGHT_SUB1, y: 520 },

        { id: 'p-end', label: 'End appointment', x: RIGHT_PRIM, y: 680 },
        { id: 'p-snapshot', label: 'Save whiteboard\nsnapshot', x: RIGHT_SUB1, y: 680 },

        // Recommendations
        { id: 'p-rec-create', label: 'Create\nrecommendation', x: RIGHT_PRIM, y: 860 },
        { id: 'p-rec-attach', label: 'Attach images\n/ audio', x: RIGHT_SUB1, y: 860 },
        { id: 'p-rec-view', label: 'View recs &\nreactions', x: RIGHT_PRIM, y: 1020 },
        { id: 'p-rec-reply', label: 'Reply to client\ncomment', x: RIGHT_SUB1, y: 1020 },
        { id: 'p-rec-edit', label: 'Edit\nrecommendation', x: RIGHT_PRIM, y: 1180 },
        { id: 'p-rec-delete', label: 'Delete\nrecommendation', x: RIGHT_PRIM, y: 1340 },

        // Progress
        { id: 'p-progress', label: 'View client\nprogress', x: RIGHT_PRIM, y: 1520 },
        { id: 'p-impr-history', label: 'View client\nimpressions', x: RIGHT_SUB1, y: 1460 },
        { id: 'p-impr-completion', label: 'View impression\ncompletion', x: RIGHT_SUB1, y: 1620 },

        // Library
        { id: 'p-img-lib', label: 'Manage associative\nimages library', x: RIGHT_PRIM, y: 1800 },
        { id: 'p-img-browse', label: 'Browse images', x: RIGHT_SUB1, y: 1740 },
        { id: 'p-img-add', label: 'Add image', x: RIGHT_SUB1, y: 1900 },
        { id: 'p-img-rename', label: 'Rename image', x: RIGHT_SUB1, y: 2060 },
        { id: 'p-img-delete', label: 'Delete image', x: RIGHT_SUB1, y: 2220 },

        // Files
        { id: 'p-upload', label: 'Upload file', x: RIGHT_PRIM, y: 2400 },
        { id: 'p-download', label: 'Download file', x: RIGHT_PRIM, y: 2560 },
    ]

    const associations = [
        'p-signin',
        'p-switch-role',
        'p-profile',
        'p-dashboard',
        'p-client-list',
        'p-add-client',
        'p-unlink',
        'p-invite-send',
        'p-invite-list',
        'p-invite-cancel',
        'p-schedule',
        'p-reschedule',
        'p-cancel-appt',
        'p-list-appts',
        'p-view-appt',
        'p-start',
        'p-conduct',
        'p-end',
        'p-rec-create',
        'p-rec-view',
        'p-rec-edit',
        'p-rec-delete',
        'p-progress',
        'p-img-lib',
        'p-upload',
        'p-download',
    ].map((uc) => ({ actor: 'psycho', uc }))

    const relations: { from: string; to: string; kind: 'include' | 'extend' }[] = [
        // Account
        { from: 'p-signin', to: 'p-select-role', kind: 'include' },

        // Dashboard
        { from: 'p-active-appt', to: 'p-dashboard', kind: 'extend' },
        { from: 'p-upcoming', to: 'p-dashboard', kind: 'extend' },

        // Clients
        { from: 'p-client-list', to: 'p-view-client', kind: 'include' },
        { from: 'p-update-client', to: 'p-view-client', kind: 'extend' },

        // Invitations
        { from: 'p-invite-send', to: 'p-invite-link', kind: 'include' },

        // Appointments – Google integration is OPTIONAL → extends
        { from: 'p-meet-create', to: 'p-schedule', kind: 'extend' },
        { from: 'p-cal-create', to: 'p-schedule', kind: 'extend' },
        { from: 'p-cal-update', to: 'p-reschedule', kind: 'extend' },
        { from: 'p-cal-delete', to: 'p-cancel-appt', kind: 'extend' },

        // Live session
        { from: 'p-conduct', to: 'p-whiteboard', kind: 'include' },
        { from: 'p-take-notes', to: 'p-conduct', kind: 'extend' },
        { from: 'p-attach-files', to: 'p-take-notes', kind: 'extend' },
        { from: 'p-live-impressions', to: 'p-conduct', kind: 'extend' },

        // End appointment
        { from: 'p-end', to: 'p-snapshot', kind: 'include' },

        // Recommendations
        { from: 'p-rec-attach', to: 'p-rec-create', kind: 'extend' },
        { from: 'p-rec-reply', to: 'p-rec-view', kind: 'extend' },

        // Progress
        { from: 'p-impr-history', to: 'p-progress', kind: 'extend' },
        { from: 'p-impr-completion', to: 'p-progress', kind: 'extend' },

        // Library — manage = browse always; CRUD ops are optional
        { from: 'p-img-lib', to: 'p-img-browse', kind: 'include' },
        { from: 'p-img-add', to: 'p-img-lib', kind: 'extend' },
        { from: 'p-img-rename', to: 'p-img-lib', kind: 'extend' },
        { from: 'p-img-delete', to: 'p-img-lib', kind: 'extend' },

        // Library is reused by downstream flows (picker/whiteboard insert)
        { from: 'p-rec-attach', to: 'p-img-browse', kind: 'extend' },
        { from: 'p-take-notes', to: 'p-img-browse', kind: 'extend' },
        { from: 'p-attach-files', to: 'p-img-browse', kind: 'extend' },
        { from: 'p-whiteboard', to: 'p-img-browse', kind: 'extend' },
    ]

    return buildDiagram({
        title: 'Use-case diagram — Psychologist',
        actors: [{ id: 'psycho', label: 'Psychologist', x: ACTOR_X, y: 1260 }],
        useCases,
        associations,
        relations,
    })
}

// ============================================================
// CLIENT
// ============================================================

function buildClient(): AnyEl {
    const LEFT_SUB2 = 40
    const LEFT_SUB1 = 360
    const LEFT_PRIM = 700
    const ACTOR_X = 1060
    const RIGHT_PRIM = 1380
    const RIGHT_SUB1 = 1740

    const useCases: UseCase[] = [
        // ==== LEFT SIDE ====
        // Account
        { id: 'c-signin', label: 'Sign in with\nGoogle', x: LEFT_PRIM, y: 100 },
        { id: 'c-select-role', label: 'Select active\nrole', x: LEFT_SUB1, y: 100 },
        { id: 'c-switch-role', label: 'Switch active\nrole', x: LEFT_PRIM, y: 260 },
        { id: 'c-accept-invite', label: 'Accept invitation\nlink', x: LEFT_PRIM, y: 420 },

        // Profile
        { id: 'c-profile', label: 'Manage own\nprofile', x: LEFT_PRIM, y: 600 },
        { id: 'c-edit-profile', label: 'Edit profile\ncontacts', x: LEFT_SUB1, y: 600 },

        // Dashboard
        { id: 'c-dashboard', label: 'View dashboard', x: LEFT_PRIM, y: 880 },
        { id: 'c-next-appt', label: 'See next\nappointment', x: LEFT_SUB1, y: 840 },
        { id: 'c-pending-recs', label: 'See pending\nrecommendations', x: LEFT_SUB1, y: 1000 },
        { id: 'c-list-psychos', label: 'See linked\npsychologists', x: LEFT_SUB1, y: 1180 },
        { id: 'c-no-psycho', label: '"No psychologist"\nprompt', x: LEFT_SUB2, y: 1180 },

        // Appointments
        { id: 'c-list-appts', label: 'View appointment\nlist', x: LEFT_PRIM, y: 1160 },
        { id: 'c-view-appt', label: 'View appointment\ndetails', x: LEFT_PRIM, y: 1400 },
        { id: 'c-open-meet', label: 'Open Google\nMeet link', x: LEFT_SUB1, y: 1400 },

        // ==== RIGHT SIDE ====
        // Live session
        { id: 'c-join-live', label: 'Join live session', x: RIGHT_PRIM, y: 100 },
        { id: 'c-whiteboard', label: 'Collaborate on\nwhiteboard', x: RIGHT_SUB1, y: 100 },

        // Impressions
        { id: 'c-submit-impr', label: 'Submit impression', x: RIGHT_PRIM, y: 280 },
        { id: 'c-impr-text', label: 'Write text', x: RIGHT_SUB1, y: 240 },
        { id: 'c-impr-images', label: 'Attach images', x: RIGHT_SUB1, y: 400 },
        { id: 'c-impr-audio', label: 'Attach audio', x: RIGHT_SUB1, y: 560 },

        { id: 'c-list-impr', label: 'View own\nimpressions', x: RIGHT_PRIM, y: 720 },
        { id: 'c-complete-impr', label: 'Complete impression\nwith response', x: RIGHT_PRIM, y: 880 },

        // Recommendations
        { id: 'c-list-recs', label: 'View\nrecommendations', x: RIGHT_PRIM, y: 1060 },
        { id: 'c-mark-done', label: 'Mark rec.\ndone', x: RIGHT_SUB1, y: 1000 },
        { id: 'c-comment', label: 'Comment on\nrecommendation', x: RIGHT_SUB1, y: 1160 },
        { id: 'c-view-reply', label: 'See psychologist\nreply', x: RIGHT_SUB1, y: 1320 },

        // Files
        { id: 'c-upload', label: 'Upload file', x: RIGHT_PRIM, y: 1500 },
        { id: 'c-download', label: 'Download file', x: RIGHT_PRIM, y: 1660 },
    ]

    const associations = [
        'c-signin',
        'c-switch-role',
        'c-accept-invite',
        'c-profile',
        'c-dashboard',
        'c-list-appts',
        'c-view-appt',
        'c-join-live',
        'c-list-impr',
        'c-complete-impr',
        'c-list-recs',
        'c-upload',
        'c-download',
    ].map((uc) => ({ actor: 'client', uc }))

    const relations: { from: string; to: string; kind: 'include' | 'extend' }[] = [
        // Account
        { from: 'c-signin', to: 'c-select-role', kind: 'include' },

        // Profile
        { from: 'c-edit-profile', to: 'c-profile', kind: 'extend' },

        // Dashboard
        { from: 'c-next-appt', to: 'c-dashboard', kind: 'extend' },
        { from: 'c-pending-recs', to: 'c-dashboard', kind: 'extend' },
        { from: 'c-list-psychos', to: 'c-dashboard', kind: 'extend' },
        { from: 'c-no-psycho', to: 'c-list-psychos', kind: 'extend' },

        // Appointments
        { from: 'c-open-meet', to: 'c-view-appt', kind: 'extend' },

        // Live session
        { from: 'c-join-live', to: 'c-whiteboard', kind: 'include' },

        // Impressions — only reachable once the appointment has started
        { from: 'c-submit-impr', to: 'c-join-live', kind: 'extend' },
        { from: 'c-impr-text', to: 'c-submit-impr', kind: 'extend' },
        { from: 'c-impr-images', to: 'c-submit-impr', kind: 'extend' },
        { from: 'c-impr-audio', to: 'c-submit-impr', kind: 'extend' },

        // Recommendations
        { from: 'c-mark-done', to: 'c-list-recs', kind: 'extend' },
        { from: 'c-comment', to: 'c-list-recs', kind: 'extend' },
        { from: 'c-view-reply', to: 'c-list-recs', kind: 'extend' },
    ]

    return buildDiagram({
        title: 'Use-case diagram — Client',
        actors: [{ id: 'client', label: 'Client', x: ACTOR_X, y: 820 }],
        useCases,
        associations,
        relations,
    })
}

// ============================================================
// GUEST
// ============================================================

function buildGuest(): AnyEl {
    const LEFT_PRIM = 280
    const GUEST_X = 700
    const RIGHT_PRIM = 1000
    const RIGHT_SUB1 = 1380
    const GOOGLE_X = 1760

    const useCases: UseCase[] = [
        // LEFT of guest
        { id: 'g-landing', label: 'View landing\npage', x: LEFT_PRIM, y: 300 },

        // RIGHT of guest
        { id: 'g-signin', label: 'Sign in with\nGoogle', x: RIGHT_PRIM, y: 100 },
        { id: 'g-select-role', label: 'Select role\n(psycho / client)', x: RIGHT_SUB1, y: 40 },
        { id: 'g-google-auth', label: 'Authenticate via\nGoogle OAuth', x: RIGHT_SUB1, y: 200 },
        { id: 'g-open-invite', label: 'Open invitation\nlink', x: RIGHT_PRIM, y: 480 },
        { id: 'g-accept-invite', label: 'Accept invitation', x: RIGHT_SUB1, y: 400 },
        { id: 'g-decline-invite', label: 'Decline invitation', x: RIGHT_SUB1, y: 560 },
    ]

    const associations: { actor: string; uc: string }[] = [
        { actor: 'guest', uc: 'g-landing' },
        { actor: 'guest', uc: 'g-signin' },
        { actor: 'guest', uc: 'g-open-invite' },
        // secondary actor
        { actor: 'google', uc: 'g-google-auth' },
    ]

    const relations: { from: string; to: string; kind: 'include' | 'extend' }[] = [
        // Sign in always delegates to Google OAuth → include
        { from: 'g-signin', to: 'g-google-auth', kind: 'include' },
        // First-time login requires role selection → include
        { from: 'g-signin', to: 'g-select-role', kind: 'include' },
        // Invitation flow can fork into accept or decline → extend
        { from: 'g-accept-invite', to: 'g-open-invite', kind: 'extend' },
        { from: 'g-decline-invite', to: 'g-open-invite', kind: 'extend' },
        // Accepting an invitation requires being signed in → include
        { from: 'g-accept-invite', to: 'g-signin', kind: 'include' },
    ]

    return buildDiagram({
        title: 'Use-case diagram — Guest / Onboarding',
        actors: [
            { id: 'guest', label: 'Guest', x: GUEST_X, y: 260 },
            { id: 'google', label: 'Google OAuth', x: GOOGLE_X, y: 180 },
        ],
        useCases,
        associations,
        relations,
    })
}

const outDir = '/Users/artem/uni/psycho/docs/diagrams'

await Bun.write(
    `${outDir}/use-case-psychologist.excalidraw`,
    JSON.stringify(buildPsychologist(), null, 2),
)
await Bun.write(`${outDir}/use-case-client.excalidraw`, JSON.stringify(buildClient(), null, 2))
await Bun.write(`${outDir}/use-case-guest.excalidraw`, JSON.stringify(buildGuest(), null, 2))

console.log('wrote 3 diagrams')
