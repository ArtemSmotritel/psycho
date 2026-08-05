# Action Plan v2 — Finish `paper.md`

Grounded strictly on the current state of `paper.md`, the methodology in
`requirements.md`, and the live codebase (the code is the source of truth
for "what the system actually does"). The earlier `action-plan.md` is
**intentionally ignored** per instruction.

---

## 1. Current state of `paper.md` (verbatim audit)

Symbols: ✅ usable, 🟡 partial / needs completion, ❌ empty or gibberish
placeholder, ⛔ missing section / heading altogether.

### Front matter
- ✅ Title page
- ✅ TOC (page-numbers will need recomputation after writing)
- 🟡 СКОРОЧЕННЯ ТА УМОВНІ ПОЗНАЧЕННЯ — only 3 entries (HIPAA, SOAP, ЕМК).
  Many domain/tech abbreviations used in the text are not declared:
  API, REST, UI, UX, SPA, SQL, OAuth, JWT, BPMN, UML, MVC, ORM,
  Google Meet, WebSocket. Add them as the chapters that introduce
  them get written.
- 🟡 ВСТУП — written, but contains three `ХХХ` placeholders in the
  "Структура та зміст роботи" sentence (figure count, source count,
  appendix count). Must be filled at the very end.

### Розділ 1
- ✅ 1.1 Актуальність та аналіз проблем
- ✅ 1.2 Огляд систем (1.2.1 TheraPlatform / 1.2.2 SimplePractice /
  1.2.3 Zoom+Calendar+Notion / 1.2.4 comparison table)
- ❌ 1.3 Огляд технологій — heading only, no body
- ✅ 1.4 Постановка задачі — written. Contains the line *"з обмеженням,
  що клієнтів може реєструвати лише психолог"* which contradicts the
  code (self-registration via Google OAuth + invitation flow). **Text
  will be rewritten** to match the code.
- ⛔ "1.4 Аналіз підґрунтя для розробки" — required by methodology
  (`requirements.md` §1.1 expected structure list) but not present
- ❌ Висновок до 1 розділу — heading only

### Розділ 2
- 🟡 2.1 Моделювання бізнес-процесів — one sentence + reference to
  фіг. 2.1, then ends.
- 🟡 2.2 Формулювання та аналіз вимог — merged section containing
  17 user stories + comparative analysis + 6 NFRs + a pointer to the
  FR backlog in Додаток В. **Will be split** into 2.2 / 2.3 / 2.4 per
  methodology (see §3, D1).
- 🟡 2.3 Попереднє архітектурне проєктування — has full prose, but:
  - claims the **component** diagram (Додаток Г) is the preliminary
    architecture. Methodology requires the preliminary architecture to
    be a **package** diagram; component diagram is the *refined*
    architecture.
  - Does not open by declaring the architectural pattern.
- 🟡 2.4 Детальне проєктування
  - ✅ Intro paragraph + 4-item agenda
  - ❌ 2.4.1 Інтерактивна дошка — heading only
  - ✅ 2.4.2 Планування сесій — activity diagram + analysis
  - 🟡 2.4.3 Нотатки / Рекомендації / Враження — loose paragraph only
  - 🟡 2.4.4 Нагадування — 3-item list of edge cases
- ❌ 2.4.х Інфологічна модель БД — placeholder `Іапівапвап`
- ❌ 2.4.х Даталогічна модель БД — placeholder `аівораіва`
- ❌ 2.Х Уточнена архітектура — placeholder `Віваіва`
- ❌ Висновки до другого розділу — placeholder `аіваіваіва`

### Розділ 3 — essentially empty
- ❌ 3.1 / 3.1.1 / 3.1.2 — placeholders
- ❌ 3.2 Структурна схема — placeholder
- ⛔ 3.3 (and its subsections) — no headings at all
- ⛔ 3.4 Тестування — missing
- ❌ Висновки до третього розділу — placeholder

### Back matter
- ❌ ВИСНОВКИ — placeholder
- 🟡 СПИСОК ВИКОРИСТАНИХ ДЖЕРЕЛ — only 8 entries
- ✅ Appendices A, Б, В, Г, Д, Е, Ж — diagrams in place. Captions and
  in-body references inconsistent (Додаток Д caption ends with "ХХХ";
  Додаток Г is referenced as preliminary architecture but actually
  shows the refined architecture).
- ⛔ Final appendix with git repository link — mandatory per methodology
  §1.8, missing.

---

## 2. Structural fixes to apply at the document level

1. **Insert §1.4 «Аналіз підґрунтя для розробки»**; renumber existing
   §1.4 → **§1.5**.
2. **Split current §2.2** into:
   - **§2.2** user stories (17 already written, move verbatim)
   - **§2.3** UML requirements analysis (use-case diagrams from
     Додатки А / Б / Д reframed with property/INVEST analysis)
   - **§2.4** functional + non-functional requirements
     (FR table in body + NFR list)
3. **Shift the rest of §2** accordingly:
   - current §2.3 → **§2.5** preliminary architecture
   - current §2.4 → **§2.6** detailed design (including DB models)
   - current §2.Х → **§2.7** refined architecture
4. **Repurpose Додаток Г** as the **refined** architecture (referenced
   from new §2.7). A new appendix with a **UML package diagram** is
   needed for §2.5.
5. **Fix Додаток Д caption** — pick a real title (kill the "ХХХ").
6. **Add a final appendix**: link to the git repository (methodology
   §1.8 — mandatory).
7. **Recompute TOC page numbers** at the very end.
8. **Renumber all figures and tables** sequentially per chapter.
9. **Fill ВСТУП "ХХХ" placeholders** (figure count, source count,
   appendix count) last.
10. **Terminology pass**: replace the product concept «сесія» / «сеанс»
    with **«консультація»** throughout the paper, leaving auth-related
    «сесія» (e.g. «сесія користувача» for HTTP session) untouched.

---

## 3. Decisions recorded (D1–D10)

Locked in; the tasks below assume them.

| # | Decision | Outcome |
|---|---|---|
| D1 | §2.2 structure | **Split into §2.2 / §2.3 / §2.4** per methodology |
| D2 | Architectural pattern label | **«Клієнт-серверна архітектура з багаторівневою серверною частиною»** |
| D3 | Term for `appointment` in Ukrainian | **«Консультація»** |
| D4 | Mismatch between §1.4 text and code on client registration | **Fix the text** — code wins |
| D5 | Number of business processes in §2.1 | **3 processes**: (a) connecting psycho ↔ client, (b) conducting a consultation, (c) post-consultation follow-up |
| D6 | FR count in §2.4 table | **Push toward 23–25** — fill the methodology cap |
| D7 | Testing approach in §3.4 | **Both automated + manual** — leverage the existing Bun test suites and document manual UI verification |
| D8 | Approbation | **Omit** — no publications planned |
| D9 | `roleless` value | **Transient pre-role state**, not a third actor |
| D10 | Bibliography citations | **Cite the full tech stack** in §1.3 and §3.1 |

---

## 4. Task list

### Chapter 1
- [ ] **1.3 Огляд технологій** — 1–2 pages. Group by role: language
  (TypeScript), runtime (Bun), backend framework (Hono), frontend
  framework (React Router v7), UI (TailwindCSS v4 + shadcn/ui), data
  (PostgreSQL, raw SQL via Bun `SQL` client), auth (better-auth +
  Google OAuth), real-time channel (mechanism actually used in the
  whiteboard feature — verify in code first), external APIs (Google
  Meet / Calendar). For each item: one-sentence purpose + one-sentence
  justification + reference link → bibliography entry (per D10).
- [ ] **1.4 Аналіз підґрунтя для розробки** — new subsection.
  1 paragraph: synthesize 1.1 (problem) + 1.2 (analog gaps) + 1.3
  (technology readiness) into the rationale for a custom web app rather
  than extending an existing tool.
- [ ] **1.5 (was 1.4) Постановка задачі** — rewrite the registration
  paragraph per D4: both roles self-register via Google OAuth; the
  psychologist gates client access through invitations to
  already-registered users. Cross-check every listed requirement
  against the actual feature folders; add any implemented features
  that are missing from the list (associative images, file upload,
  role selection, invitation lifecycle, dashboards, progress).
- [ ] **Висновок до 1 розділу** — 1–2 paragraphs summarizing chapter 1.

### Chapter 2
- [ ] **2.1 Моделювання бізнес-процесів** — name and describe the
  **3 business processes** from D5 (connecting, conducting, follow-up);
  identify the actors per process. Per D9, state that there are
  **2 actors** (психолог, клієнт) and that "roleless" is a transient
  pre-role state during OAuth onboarding, not a separate actor. Confirm
  fig 2.1 BPMN shows all 3 processes — redraw if it doesn't.
- [ ] **2.2 Користувацькі історії** — move the 17 stories already
  written verbatim from the current merged section.
- [ ] **2.3 Аналіз вимог через UML-діаграми** — use cases (Додаток А
  for психолог, Додаток Б for клієнт, Додаток Д for attachments). For
  each diagram add 3-part framing: (1) which requirement property is
  being analyzed (e.g. INVEST: Independent / Negotiable / Valuable /
  Estimable / Small / Testable), (2) what the analysis revealed,
  (3) what design decision followed. Add ≥1 sequence/activity diagram
  reused from current §2.4 (фіг. 2.2, Додаток Е).
- [ ] **2.4 Функціональні та нефункціональні вимоги** — write the FR
  table in the body with the exact methodology columns:
  «№ | Назва вимоги | Важливість | Як продемонструвати | Примітки».
  Target **23–25 rows** (D6), ranked by descending importance. After
  the table, list the NFRs — start with the 6 already in §2.2, then
  add at least 3 more derived from the code (data isolation per
  psycho-client pair; notes confidentiality even after disconnect;
  appointment lifecycle integrity / no concurrent active appointments).
  Remove Додаток В or repurpose it as an extended backlog.
- [ ] **2.5 Попереднє архітектурне проєктування** —
  - opening paragraph declares the pattern per D2 and justifies it
    against MVC / MVP / SOA alternatives
  - new **UML package diagram** (new appendix). Suggested backend
    packages mapping to feature folders: Auth, Users, Clients &
    Invitations, Appointments, Whiteboard, Attachments
    (Notes / Recommendations / Impressions), Associative Images,
    Files, Dashboard, Progress. Frontend packages: Auth UI,
    Psychologist workspace, Client workspace, Live consultation UI,
    Whiteboard UI. External: Google OAuth, Google Meet/Calendar,
    file storage (verify whether anything beyond local disk is used).
  - keep server / client decomposition prose (current 2.3.1 / 2.3.2)
    as subsections of 2.5.
- [ ] **2.6 Детальне проєктування** — promote current §2.4 contents:
  - [ ] 2.6.1 Інтерактивна дошка — fill in. Need a state or activity
    diagram showing the WebSocket exchange, snapshot persistence, and
    reconnect behavior. Read `backend/src/features/whiteboard/` and the
    frontend whiteboard components first to write accurately.
  - [ ] 2.6.2 Планування консультацій — already written; add 1–2
    sentences about the consultation status lifecycle
    (upcoming → active → past / missed / warning, per `Appointment.status`).
  - [ ] 2.6.3 Нотатки / Рекомендації / Враження — promote the existing
    paragraph; reference Додаток Е (sequence) and Додаток Д (use case).
    Describe `attachment_files` / `recommendation_reactions` /
    `impression_completions` conceptually (not physically).
  - [ ] 2.6.4 Нагадування — describe the algorithm, reference Додаток Ж.
    First verify the feature is implemented in code (no `reminders`
    folder spotted); if it is **not**, demote to "designed, not yet
    realized" or drop the subsection + appendix.
  - [ ] 2.6.5 Інфологічна (концептуальна) модель БД — ER diagram with
    entities and attributes (no FK lines). Entities from migrations:
    `users` (better-auth), `psychologists`, `clients`,
    `psychologist_clients`, `appointments`, `attachments`,
    `attachment_files`, `files`, `recommendation_reactions`,
    `impression_completions`, `associative_images`, `invitations`.
  - [ ] 2.6.6 Даталогічна (логічна) модель БД — same diagram with FKs,
    cardinalities, unique/not-null annotations. Prose listing each
    relationship and what it represents.
- [ ] **2.7 Уточнена архітектура** — reuse the component diagram in
  Додаток Г. Update Додаток Г caption to "refined architecture".
  Write 1–2 paragraphs explaining (a) what changed from the
  preliminary package diagram (split into Route / Service / Repo,
  named external integrations, etc.), (b) why.
- [ ] **Висновки до другого розділу** — 1–2 paragraphs.

### Chapter 3 (largest gap)
- [ ] **3.1 Вибір мови та середовища**
  - [ ] 3.1.1 Language: TypeScript — type safety, single language across
    stack, ecosystem
  - [ ] 3.1.2 Environment / runtime / libs: Bun + Hono backend, Vite +
    React Router v7 frontend, PostgreSQL + raw SQL, better-auth +
    Google OAuth, shadcn/ui, TailwindCSS v4, Prettier, oxlint. For each
    item: short paragraph + citation (per D10). Include IDE (VS Code)
    and VCS (Git/GitHub).
- [ ] **3.2 Структурна схема ПЗ** — PSM diagram showing actual file /
  module layout that realizes the refined architecture: backend
  `src/features/<feature>/{routes,services,repo,models}.ts`,
  middlewares, migrations; frontend `app/{routes,components,
  contexts,services,models}`. Annotate frameworks per module
  (React Router, Hono). 2–3 paragraphs of description.
- [ ] **3.3 Реалізація компонентів ПЗ** — new section; subsections per
  package. For each: 1 block / activity / sequence diagram + 1–2
  paragraphs of prose; optional small code snippet (full code in an
  appendix per methodology §1.8).
  - [ ] 3.3.1 Автентифікація та ролі — OAuth flow, role header,
    `setUserRole`, role-guard middlewares
  - [ ] 3.3.2 Управління клієнтами та запрошеннями — invitation token
    flow, "add client" endpoint, disconnect semantics
  - [ ] 3.3.3 Управління консультаціями — create / update / delete /
    lifecycle; Google Meet & Calendar integration
  - [ ] 3.3.4 Інтерактивна дошка — WebSocket handling, snapshot &
    state persistence
  - [ ] 3.3.5 Вкладення (нотатки / рекомендації / враження) — shared
    attachment pipeline, file uploads, reaction & completion tracking
  - [ ] 3.3.6 Асоціативні зображення — CRUD library
  - [ ] 3.3.7 Дашборди та прогрес — aggregation queries
  - [ ] 3.3.8 Фізична модель БД — table-by-table description using the
    actual SQL types from `backend/src/migrations/*.sql`. Per-table
    sub-table with columns: «Назва поля | Тип даних | Обмеження»
    (format from example.md tables 3.1–3.9 is acceptable).
  - [ ] 3.3.9 Інтерфейс користувача — screen catalogue with screenshots:
    login, role select, psycho dashboard, client list, client profile,
    consultations list, live consultation + whiteboard, attachment
    detail, client dashboard, client progress. For each: who can see
    it, what it does, key elements. Add a **navigation diagram** that
    reflects the `/:role/...` routing.
  - [ ] 3.3.10 Загальна діаграма класів — high-level class diagram of
    the main frontend models and backend service modules.
- [ ] **3.4 Тестування** — per D7, present **both** automated and
  manual testing:
  - [ ] Justify the approach in 1 paragraph. Automated: backend has
    Bun test suites (`*.test.ts` per feature) covering routes &
    services. Manual: UI flows verified end-to-end by the developer.
  - [ ] Results table (one row per FR) per methodology Додаток Б
    template: «№ | Назва вимоги | Очікуваний результат | Фактичний
    результат». Source outcomes from `bun test` + manual UI checks.
  - [ ] Coverage matrix (FR × test class) — optional but methodology
    suggests it.
  - [ ] 1-paragraph conclusion: meets requirements / ready for use.
- [ ] **Висновки до третього розділу** — 1–2 paragraphs.

### Back matter
- [ ] **ВИСНОВКИ** — cover the 5 methodology §1.6 points; per D8 omit
  approbation entirely:
  1. Which tasks from ВСТУП were solved (list)
  2. What product was built + full tech stack
  3. Key product features (custom whiteboard for consultations,
     dual-role SPA, shared attachment pipeline, Google Meet/Calendar
     integration, invitation-gated workspace, etc.)
  4. Practical value (vs the fragmented Zoom + Calendar + Notion
     baseline from §1.2.3)
  5. ~~Approbation~~ — skip per D8
- [ ] **СПИСОК ДЖЕРЕЛ** — extend per D10. Add: TypeScript, Bun, Hono,
  React Router v7, TailwindCSS v4, shadcn/ui, PostgreSQL, better-auth,
  Google OAuth, Google Meet API, Google Calendar API, the whiteboard
  library actually used, Vite, Bun test runner, any UML reference,
  ДСТУ 3008:2015, ДСТУ 8302:2015. Expect ~18–20 entries total.
  Cross-check every `[N]` after expansion.
- [ ] **СКОРОЧЕННЯ** — add the tech abbreviations that show up in
  chapters 2–3 (API, REST, UI, UX, SPA, SQL, OAuth, BPMN, UML, ORM,
  PSM, PIM, СКБД, etc.). Keep alphabetical.

### Appendices
- [ ] Repair Додаток Д caption (`ХХХ`).
- [ ] Relabel Додаток Г as the **refined** architecture.
- [ ] Add new appendix: **UML package diagram** for §2.5.
- [ ] Add new appendix: **ER (conceptual) diagram** if not embedded in
  body.
- [ ] Add new appendix: **logical DB model** if not embedded in body.
- [ ] Add new appendix: **navigation diagram** for §3.3.9.
- [ ] Add new appendix: **overall class diagram** for §3.3.10.
- [ ] Add new appendix: **screen catalogue** (large screenshots) if the
  shots don't fit in §3.3.9.
- [ ] Add new appendix: **code fragments** for any non-trivial snippet
  cited in §3.3.
- [ ] Add **last appendix**: link to the git repository (methodology
  §1.8 — mandatory).

---

## 5. Diagrams checklist

| Diagram | Status | Used in | Tool note |
|---|---|---|---|
| Business process (BPMN) | ✅ exists (fig 2.1) | §2.1 | verify labels match the 3 processes from D5 |
| Use-case psycho | ✅ Додаток А | §2.3 | check covers all 17 user stories |
| Use-case client | ✅ Додаток Б | §2.3 | check covers all 17 user stories |
| Use-case attachments | ✅ Додаток Д | §2.3 / §2.6.3 | fix caption "ХХХ" |
| Activity: consultation planning | ✅ fig 2.2 | §2.6.2 | rename "сесія" → «консультація» per D3 |
| Sequence: recommendation creation | ✅ Додаток Е | §2.6.3 | add narrative |
| Activity: reminders | ✅ Додаток Ж | §2.6.4 | confirm feature exists in code first |
| Whiteboard detailed design diagram | ⛔ missing | §2.6.1 | new — read whiteboard code first |
| Consultation lifecycle (state diagram) | ⛔ missing | §2.6.2 supplement | derived from `status` enum |
| Package diagram (preliminary arch) | ⛔ missing | §2.5 | new — required by D2 |
| Conceptual ER model | ⛔ placeholder | §2.6.5 | new |
| Logical DB model | ⛔ placeholder | §2.6.6 | new |
| Component diagram (refined arch) | ✅ Додаток Г | §2.7 | reuse, relabel |
| Structural / file-layout scheme | ⛔ missing | §3.2 | new |
| Physical DB model | ⛔ missing | §3.3.8 | derive from migrations |
| Per-package block / activity diagrams | ⛔ missing (×7) | §3.3.1–§3.3.7 | new |
| Navigation diagram (UI) | ⛔ missing | §3.3.9 | new |
| Overall class diagram | ⛔ missing | §3.3.10 | new |

All new diagrams should be produced as `.excalidraw` files in
`docs/diagrams/` (consistent with the existing
`docs/diagrams/seq.excalidraw`), then exported to PNG/SVG for the paper.

---

## 6. Suggested execution order

| Wave | Items | Why first |
|------|-------|-----------|
| 1. Quick structural fixes | §2 fixes 1–6, 10 (renumber, terminology pass, caption fixes) | Cheap; unblocks everything that references new numbering / terms |
| 2. Chapter 2 backbone | §2.1; §2.2 (move stories); §2.5 (pattern + package diagram); §2.6.5; §2.6.6 | Architecture & DB models drive chapter 3 |
| 3. Detailed design fills | §2.3 (UML analysis); §2.4 (FR table to 23–25); §2.6.1, §2.6.3, §2.6.4; §2.7 | Now you have the package diagram to refine |
| 4. Chapter 1 polishing | §1.3; §1.4 (new); §1.5 fix; висновок-1 | Independent — can parallelize with wave 2/3 |
| 5. Chapter 3 backbone | §3.1; §3.2; §3.3.8 (physical DB) | These reuse the chapter-2 architecture work |
| 6. Chapter 3 module sections | §3.3.1–§3.3.7 | Bulk of the writing |
| 7. UI + class diagrams | §3.3.9; §3.3.10 | Need screenshots from running app |
| 8. Testing | §3.4 (auto + manual per D7) | Run `bun test`, log manual results |
| 9. Wrap-up | висновок-2, висновок-3, ВИСНОВКИ (no approbation per D8); СКОРОЧЕННЯ; bibliography (full stack per D10); ВСТУП `ХХХ` counts; appendices ordering; TOC page numbers | Must be last because counts/numbers stabilize only now |

---

## 7. Things to verify against the code before writing

Doing this once up front prevents incorrect claims that get caught at
defense.

- [ ] Whether a real-time **reminders** feature actually exists in the
  backend (no `features/reminders/` folder spotted). If not, either
  drop §2.6.4 / Додаток Ж or describe it as designed-but-not-implemented.
- [ ] The exact **WebSocket / real-time mechanism** used by the
  whiteboard (library name + transport) — needed for §1.3, §2.6.1,
  §3.3.4, and the bibliography (D10).
- [ ] Whether **email notifications** are actually sent anywhere (the
  paper claims "email reminders"). If not, demote the claim.
- [ ] The exact **Google Calendar** integration scope and what it does
  (the migration shows `google_calendar_event_id` on appointments).
- [ ] Confirm **client self-registration** is permitted (Google OAuth)
  and that the only gate is invitation-to-workspace — needed to write
  §1.5 correctly (D4).
- [ ] The full **consultation status** state machine including
  `warning` and `missed` transitions (frontend model lists them).
- [ ] All **migrations** for the per-table description in §3.3.8.

---

## 8. Operational decisions (O1–O8)

How the work itself gets done. Locked in.

| # | Decision | Outcome |
|---|---|---|
| O1 | Master document | **Google Doc / DOCX** held by the user. `paper.md` is a working copy; final formatting per ДСТУ 3008:2015 happens in the master. |
| O2 | Delivery channel for finished Ukrainian text | **One file per section under `docs/sections/`** (e.g. `docs/sections/2.5-prelim-arch.md`). User pastes into the Google Doc. |
| O3 | Writing language | **Direct Ukrainian** — final-quality prose ready to paste. |
| O4 | Diagrams | I draw via the **excalidraw skill** into `docs/diagrams/`. User reviews, corrects by hand, and places into the master; sends back if I should adjust the source. |
| O5 | Code-side fact verification | I **grep the code myself** before writing the affected section (per §7 list). Surface findings before drafting. |
| O6 | Length per section | **No explicit budget.** Focus on completeness; trim at the end if total overshoots 60 pp. |
| O7 | Off-limits / approved sections | **None.** Everything in `paper.md` is editable. |
| O8 | Screenshot environment | **Dev env runs but needs seeding** before §3.3.9. Either run through OAuth + create test data manually, or write a seed script. Decide when we get there. |

---

## 9. Out of scope for this plan

- Implementing or editing `paper.md` itself (per your instruction).
- Re-litigating `action-plan.md` (ignored per your instruction).
- Changes to the *program code* — earlier analysis concluded the code
  already satisfies the methodology's project-complexity envelope.
- Defense slide deck, відгук, рецензія, заява, нормоконтроль steps
  from `requirements.md` Розділ 3 — those are post-paper tasks.
