// Stress-data seed. Truncates every app table and fills the DB with a large,
// varied dataset to exercise every frontend page.
//
// Prerequisite: the 37 files named `seed-*` must already exist in ./uploads/
// (copied manually once from ../extracted-images/).
//
// Run: `bun run seed`

import { db } from 'config/db'
import { ALL_APP_TABLES } from '../src/test-fixtures/db'
import { insertTestUser } from '../src/test-fixtures/users'
import { UsersService } from '../src/features/users/services'
import { createAppointment } from '../src/features/appointments/services'
import { createAttachment, upsertReaction, setReply } from '../src/features/attachments/services'
import { InvitationsService } from '../src/features/invitations/services'
import { join, extname } from 'node:path'
import { ClientsService } from '../src/features/clients/services'

// ─── Static image list (pre-copied to backend/uploads/) ────────────────────
const SEED_IMAGES = [
    'seed-page10.png',
    'seed-page11.png',
    'seed-page12.png',
    'seed-page16.png',
    'seed-page17_1.png',
    'seed-page17_2.png',
    'seed-page23.png',
    'seed-page25.png',
    'seed-page26.png',
    'seed-page27.png',
    'seed-page29.png',
    'seed-page31.jpeg',
    'seed-page41.jpeg',
    'seed-page43.png',
    'seed-page44.png',
    'seed-page46.png',
    'seed-page47.png',
    'seed-page52.png',
    'seed-page58.png',
    'seed-page59.png',
    'seed-page60.png',
    'seed-page61.png',
    'seed-page62.png',
    'seed-page63_1.png',
    'seed-page63_2.png',
    'seed-page64.png',
    'seed-page65.png',
    'seed-page66.png',
    'seed-page67_1.png',
    'seed-page67_2.png',
    'seed-page68.png',
    'seed-page69.png',
    'seed-page75.png',
    'seed-page76.png',
    'seed-page77.png',
    'seed-page78.png',
    'seed-page9.png',
] as const

// ─── Content arrays ────────────────────────────────────────────────────────
const PSYCHO_FIRST_NAMES = ['Оксана', 'Ігор']
const PSYCHO_LAST_NAMES = ['Коваленко', 'Бондар']
const CLIENT_NAMES = [
    'Андрій Мельник',
    'Катерина Шевченко',
    'Денис Ткаченко',
    'Марія Бойко',
    'Олег Ковальчук',
    'Ірина Лисенко',
    'Сергій Козак',
    'Наталія Гончар',
    'Павло Савчук',
    'Юлія Кравець',
]

const APPOINTMENT_TITLES = [
    'Перша консультація',
    'Робота з тривожністю',
    'Відносини з партнером',
    'Професійне вигорання',
    'Самооцінка та впевненість',
    'Робота з дитячими травмами',
    'Межі у стосунках',
    'Емоційне виснаження',
    'Підготовка до важливої події',
    'Сімейні конфлікти',
    'Переживання втрати',
    'Пошук себе',
]

const NOTE_TEXTS = [
    'Клієнт виглядає напружено, говорить про постійне відчуття втоми.',
    'Обговорили техніки дихання 4-7-8, клієнт виконав вправу успішно.',
    'Перехід до обговорення стосунків з батьками викликав сильні емоції.',
    'Клієнт повідомив про покращення сну за останній тиждень.',
    'Спостерігається прогрес у здатності розпізнавати тригери.',
    'Обговорили конкретну ситуацію на роботі, де клієнт відчув безсилля.',
    'Клієнт сам запропонував перехід до теми власних кордонів.',
    'Помітна більша відкритість у розмові порівняно з попередніми сесіями.',
    'Проговорили страх невдачі в контексті нового проєкту.',
    'Клієнт вперше сформулював свої потреби у стосунках.',
    'Повернулися до теми втрати, клієнт готовий говорити деталями.',
    'Закріпили практики самопідтримки між сесіями.',
]

const IMPRESSION_TEXTS = [
    'Поділіться трьома моментами, коли ви відчули спокій цього тижня.',
    'Яка ваша головна емоція після сьогоднішньої сесії?',
    'Опишіть ситуацію, де ви застосували техніку, яку ми обговорювали.',
    'Що зараз у вашому житті дає вам відчуття опори?',
    'Які думки виникають, коли ви думаєте про минулу сесію?',
    'Яка ваша основна знахідка цього тижня?',
]

const CLIENT_RESPONSES = [
    'Я помітив, що вранці спокійніше, ніж ввечері. Спробував дихати глибше перед сном.',
    'Найчастіше відчуваю втому, але вже без тривоги.',
    'На роботі була ситуація з керівником — зміг не реагувати імпульсивно.',
    'Опора — це спорт і розмови з подругою.',
    'Думаю про те, як довго я замовчував власні потреби.',
    'Зрозумів, що я можу відмовляти без провини.',
]

const RECOMMENDATION_TEXTS = [
    'Щоденник емоцій: фіксуй три сильні емоції щодня протягом тижня.',
    'Практика заземлення 5-4-3-2-1 двічі на день.',
    'Обмежити час у соцмережах до 30 хвилин на день.',
    'Читання: "The Body Keeps the Score", глави 1-3.',
    'Записати лист собі у 16 років — не відправляти.',
    'Визначити три власних потреби у стосунках і озвучити їх партнеру.',
]

const CLIENT_COMMENTS = [
    'Було важко, але зробив щоденник чотири дні з семи.',
    'Заземлення дуже допомагає, особливо вранці.',
    'Соцмережі виявилися важчі, ніж думав. Спробую ще раз.',
    'Прочитав першу главу, сильна реакція. Треба буде обговорити.',
    'Не зміг написати лист — відкладаю наступного тижня.',
    'Озвучив одну потребу, партнер сприйняв нормально.',
]

const PSYCHO_REPLIES = [
    'Чудовий прогрес. Продовжуй у своєму темпі — важливо, що ти це робиш.',
    'Дякую, що ділишся. Завтра обговоримо що саме зупиняло.',
    'Те, що складно — це нормальна реакція. Помічай, що саме викликає опір.',
    'Обговоримо на сесії. Підготуй кілька цитат, які найбільше резонують.',
    'Гаразд, не тисни на себе. Ми повернемося до цього згодом.',
    'Це великий крок. Відзнач собі, що вдалося зробити.',
]

const ASSOCIATIVE_IMAGE_NAMES = [
    'Дорога',
    'Мандрівник',
    'Міст',
    'Двері',
    'Ключ',
    'Дерево',
    'Ріка',
    'Гора',
    'Вікно',
    'Сонце',
    'Світло',
    'Тінь',
    'Птах у клітці',
    'Птах у польоті',
    'Човен',
    'Компас',
    'Маяк',
    'Хмари',
    'Ліс',
    'Стежина',
    'Сходи',
    'Відображення',
    'Дім',
    'Вулиця',
    'Знак питання',
    'Серце',
    "Зв'язок",
    'Розгалуження',
    'Коло',
    'Спіраль',
]

// ─── Helpers ───────────────────────────────────────────────────────────────
const pick = <T>(arr: readonly T[], i: number): T => arr[i % arr.length]!

const mimeFor = (path: string): string => {
    const ext = extname(path).toLowerCase()
    if (ext === '.png') return 'image/png'
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
    return 'application/octet-stream'
}

const isoDaysFromNow = (days: number, hours = 10): string => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(hours, 0, 0, 0)
    return d.toISOString()
}

// ─── Seed ──────────────────────────────────────────────────────────────────
async function seed() {
    console.log('🌱 Starting stress seed...')

    // Step 1: truncate everything
    console.log('Truncating all app tables...')
    await db.unsafe(`TRUNCATE TABLE ${ALL_APP_TABLES.join(', ')} RESTART IDENTITY CASCADE`)

    // Step 2: create users (triggers databaseHooks → clients + psychologists rows)
    console.log('Creating users...')
    const psychos: Array<{ id: string; email: string; name: string }> = []
    for (let i = 0; i < 2; i++) {
        const name = `${PSYCHO_FIRST_NAMES[i]} ${PSYCHO_LAST_NAMES[i]}`
        const email = `psycho${i + 1}@seed.local`
        const u = await insertTestUser({ email, name })
        await UsersService.setActiveRole(u.id, 'psycho')
        psychos.push({ id: u.id, email, name })
    }

    const clients: Array<{ id: string; email: string; name: string }> = []
    for (let i = 0; i < 10; i++) {
        const name = CLIENT_NAMES[i]!
        const email = `client${i + 1}@seed.local`
        const u = await insertTestUser({ email, name })
        await UsersService.setActiveRole(u.id, 'client')
        clients.push({ id: u.id, email, name })
    }

    // Populate client contact fields for the profile page
    for (let i = 0; i < clients.length; i++) {
        const c = clients[i]!
        await db`
            UPDATE clients SET
                username = ${c.name.split(' ')[0]!.toLowerCase() + i},
                phone = ${`+38050${String(1000000 + i * 7919).slice(-7)}`},
                telegram = ${`@${c.name.split(' ')[0]!.toLowerCase()}_${i}`},
                instagram = ${`${c.name.split(' ')[0]!.toLowerCase()}.${i}`}
            WHERE user_id = ${c.id}
        `
    }

    // Step 3: link clients ↔ psychologists
    //  psycho1 ↔ clients 1-7, psycho2 ↔ clients 6-10 (6,7 overlap)
    console.log('Linking clients to psychologists...')
    for (let i = 0; i <= 6; i++)
        await ClientsService.linkClientToPsycho(clients[i]!.id, psychos[0]!.id)
    for (let i = 5; i <= 9; i++)
        await ClientsService.linkClientToPsycho(clients[i]!.id, psychos[1]!.id)

    // Two disconnected links (retain history):
    //  client8 → psycho1 disconnected, client9 → psycho2 disconnected
    await ClientsService.linkClientToPsycho(clients[7]!.id, psychos[0]!.id)
    await db`
        UPDATE psychologist_clients
        SET disconnected_at = NOW() - INTERVAL '30 days'
        WHERE client_id = ${clients[7]!.id} AND psycho_id = ${psychos[0]!.id}
    `
    await ClientsService.linkClientToPsycho(clients[8]!.id, psychos[1]!.id)
    await db`
        UPDATE psychologist_clients
        SET disconnected_at = NOW() - INTERVAL '14 days'
        WHERE client_id = ${clients[8]!.id} AND psycho_id = ${psychos[1]!.id}
    `

    // Step 4: insert files (one per image on disk)
    console.log('Inserting file records...')
    const fileIds: string[] = []
    for (let i = 0; i < SEED_IMAGES.length; i++) {
        const storedName = SEED_IMAGES[i]!
        const originalName = storedName.replace(/^seed-/, '')
        const mimeType = mimeFor(storedName)
        const path = join(import.meta.dir, '..', 'uploads', storedName)
        const size = Bun.file(path).size
        const uploader = psychos[i % 2]!.id
        const [row] = await db`
            INSERT INTO files (original_name, stored_name, mime_type, size, uploaded_by)
            VALUES (${originalName}, ${storedName}, ${mimeType}, ${size}, ${uploader})
            RETURNING id
        `
        fileIds.push(row.id as string)
    }

    // Step 5: associative images (30 total across the two psychos)
    console.log('Inserting associative images...')
    for (let i = 0; i < 20; i++) {
        const fileId = fileIds[i % fileIds.length]!
        await db`
            INSERT INTO associative_images (psychologist_id, name, file_id)
            VALUES (${psychos[0]!.id}, ${pick(ASSOCIATIVE_IMAGE_NAMES, i)}, ${fileId})
        `
    }
    for (let i = 0; i < 10; i++) {
        const fileId = fileIds[(i + 20) % fileIds.length]!
        await db`
            INSERT INTO associative_images (psychologist_id, name, file_id)
            VALUES (${psychos[1]!.id}, ${pick(ASSOCIATIVE_IMAGE_NAMES, i + 20)}, ${fileId})
        `
    }

    // Step 6: invitations (4 pending)
    console.log('Inserting invitations...')
    await InvitationsService.createForPsycho(psychos[0]!.id, 'invitee1@seed.local')
    await InvitationsService.createForPsycho(psychos[0]!.id, 'invitee2@seed.local')
    await InvitationsService.createForPsycho(psychos[1]!.id, 'invitee3@seed.local')
    await InvitationsService.createForPsycho(psychos[1]!.id, 'invitee4@seed.local')

    // Step 7: appointments — 36 total across all statuses
    // Psycho1 takes 22, psycho2 takes 14
    console.log('Creating appointments and attachments...')

    type Slot = {
        psychoIdx: number
        clientIdx: number
        startTime: string
        endTime: string
        startedAt: Date | null
        endedAt: Date | null
    }

    const slots: Slot[] = []

    // PAST (22) — started_at + ended_at set, end_time in the past
    for (let i = 0; i < 22; i++) {
        const daysAgo = 2 + i * 3 // 2, 5, 8, ... days ago
        const start = new Date()
        start.setDate(start.getDate() - daysAgo)
        start.setHours(10 + (i % 6), 0, 0, 0)
        const end = new Date(start)
        end.setHours(end.getHours() + 1)
        const psychoIdx = i < 14 ? 0 : 1
        const clientIdx = psychoIdx === 0 ? i % 7 : 5 + (i % 5)
        slots.push({
            psychoIdx,
            clientIdx,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            startedAt: start,
            endedAt: end,
        })
    }

    // UPCOMING (6) — start_time in the future
    for (let i = 0; i < 6; i++) {
        const start = new Date(isoDaysFromNow(i + 1, 10 + (i % 6)))
        const end = new Date(start)
        end.setHours(end.getHours() + 1)
        const psychoIdx = i % 2
        const clientIdx = psychoIdx === 0 ? i % 7 : 5 + (i % 5)
        slots.push({
            psychoIdx,
            clientIdx,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            startedAt: null,
            endedAt: null,
        })
    }

    // ACTIVE (2) — started_at set, end_time in the future
    for (let i = 0; i < 2; i++) {
        const start = new Date()
        start.setMinutes(start.getMinutes() - 30)
        const end = new Date()
        end.setMinutes(end.getMinutes() + 30)
        slots.push({
            psychoIdx: i,
            clientIdx: i === 0 ? 0 : 5,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            startedAt: start,
            endedAt: null,
        })
    }

    // WARNING (2) — NOW between start_time and end_time, no started_at yet
    for (let i = 0; i < 2; i++) {
        const start = new Date()
        start.setMinutes(start.getMinutes() - 10)
        const end = new Date()
        end.setMinutes(end.getMinutes() + 50)
        slots.push({
            psychoIdx: i,
            clientIdx: i === 0 ? 1 : 6,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            startedAt: null,
            endedAt: null,
        })
    }

    // MISSED (4) — end_time in the past, no started_at
    for (let i = 0; i < 4; i++) {
        const start = new Date()
        start.setDate(start.getDate() - (i + 1) * 4)
        start.setHours(14, 0, 0, 0)
        const end = new Date(start)
        end.setHours(end.getHours() + 1)
        const psychoIdx = i % 2
        const clientIdx = psychoIdx === 0 ? (i + 2) % 7 : 5 + (i % 5)
        slots.push({
            psychoIdx,
            clientIdx,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            startedAt: null,
            endedAt: null,
        })
    }

    // Insert appointments
    const appointments: Array<{ id: string; slot: Slot }> = []
    for (const slot of slots) {
        const appt = await createAppointment({
            psychoId: psychos[slot.psychoIdx]!.id,
            clientId: clients[slot.clientIdx]!.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
        })
        // Backfill started_at / ended_at that createAppointment doesn't set
        if (slot.startedAt) {
            await db`UPDATE appointments SET started_at = ${slot.startedAt.toISOString()} WHERE id = ${appt.id}`
        }
        if (slot.endedAt) {
            await db`UPDATE appointments SET ended_at = ${slot.endedAt.toISOString()} WHERE id = ${appt.id}`
        }
        appointments.push({ id: appt.id, slot })
    }

    // Step 8: attachments on past appointments
    console.log('Inserting attachments, reactions, completions...')
    let attachmentCounter = 0
    for (const { id: appointmentId, slot } of appointments) {
        if (!slot.endedAt) continue // only past appointments

        const psychoId = psychos[slot.psychoIdx]!.id
        const clientId = clients[slot.clientIdx]!.id

        // 1-2 notes (author = psychologist)
        const noteCount = 1 + (attachmentCounter % 2)
        for (let n = 0; n < noteCount; n++) {
            const imgIds =
                attachmentCounter % 3 === 0 ? [fileIds[attachmentCounter % fileIds.length]!] : []
            await createAttachment({
                appointmentId,
                authorId: psychoId,
                type: 'note',
                text: pick(NOTE_TEXTS, attachmentCounter + n),
                imageFileIds: imgIds,
            })
            attachmentCounter++
        }

        // 1 impression (author = psychologist); ~70% get a client completion
        const impr = await createAttachment({
            appointmentId,
            authorId: psychoId,
            type: 'impression',
            text: pick(IMPRESSION_TEXTS, attachmentCounter),
        })
        if (attachmentCounter % 10 !== 7 && attachmentCounter % 10 !== 3) {
            await db`
                INSERT INTO impression_completions (attachment_id, client_response)
                VALUES (${impr.id}, ${pick(CLIENT_RESPONSES, attachmentCounter)})
            `
        }
        attachmentCounter++

        // 1 recommendation (author = psychologist); most get a reaction
        const recText = pick(RECOMMENDATION_TEXTS, attachmentCounter)
        const rec = await createAttachment({
            appointmentId,
            authorId: psychoId,
            type: 'recommendation',
            name: recText.split(':')[0] ?? undefined,
            text: recText,
        })
        // Reaction mix: done+comment, comment-only, done-only, none, + reply variants
        const mode = attachmentCounter % 5
        if (mode === 0) {
            await upsertReaction(rec.id, {
                done: true,
                comment: pick(CLIENT_COMMENTS, attachmentCounter),
            })
            await setReply(rec.id, pick(PSYCHO_REPLIES, attachmentCounter))
        } else if (mode === 1) {
            await upsertReaction(rec.id, { comment: pick(CLIENT_COMMENTS, attachmentCounter) })
        } else if (mode === 2) {
            await upsertReaction(rec.id, { done: true })
            await setReply(rec.id, pick(PSYCHO_REPLIES, attachmentCounter))
        } else if (mode === 3) {
            // no reaction at all
        } else {
            await upsertReaction(rec.id, {
                done: false,
                comment: pick(CLIENT_COMMENTS, attachmentCounter),
            })
        }
        attachmentCounter++

        // Optional extra impression with images (every 3rd past appointment)
        if (attachmentCounter % 6 === 0) {
            const imgIds = [
                fileIds[attachmentCounter % fileIds.length]!,
                fileIds[(attachmentCounter + 1) % fileIds.length]!,
            ]
            const impr2 = await createAttachment({
                appointmentId,
                authorId: psychoId,
                type: 'impression',
                text: pick(IMPRESSION_TEXTS, attachmentCounter + 3),
                imageFileIds: imgIds,
            })
            await db`
                INSERT INTO impression_completions (attachment_id, client_response)
                VALUES (${impr2.id}, ${pick(CLIENT_RESPONSES, attachmentCounter + 3)})
            `
            attachmentCounter++
        }

        void clientId // not written directly; retained for symmetry
    }

    // Step 9: also give each *active* appointment a note, so the live session
    // view has something on day-of
    for (const { id: appointmentId, slot } of appointments) {
        if (slot.startedAt && !slot.endedAt) {
            await createAttachment({
                appointmentId,
                authorId: psychos[slot.psychoIdx]!.id,
                type: 'note',
                text: 'Сесія щойно розпочалася. Клієнт виглядає зосередженим.',
            })
        }
    }

    // Summary
    const [apptCount] = await db`SELECT COUNT(*)::int AS c FROM appointments`
    const [attCount] = await db`SELECT COUNT(*)::int AS c FROM attachments`
    const [fileCount] = await db`SELECT COUNT(*)::int AS c FROM files`
    const [aiCount] = await db`SELECT COUNT(*)::int AS c FROM associative_images`
    const [invCount] = await db`SELECT COUNT(*)::int AS c FROM invitations`

    console.log('')
    console.log('✓ Seed complete')
    console.log(`  psychologists : ${psychos.length}`)
    console.log(`  clients       : ${clients.length}`)
    console.log(`  appointments  : ${apptCount.c}`)
    console.log(`  attachments   : ${attCount.c}`)
    console.log(`  files         : ${fileCount.c}`)
    console.log(`  assoc. images : ${aiCount.c}`)
    console.log(`  invitations   : ${invCount.c}`)
    console.log('')
    console.log('Log in with a seeded user by visiting:')
    console.log('  http://localhost:5173/api/auth/sign-in/dev-as/psycho1@seed.local')
    console.log('  http://localhost:5173/api/auth/sign-in/dev-as/client1@seed.local')
}

try {
    await seed()
} catch (err) {
    console.error('Seed failed:', err)
    process.exit(1)
} finally {
    await db.close()
}
