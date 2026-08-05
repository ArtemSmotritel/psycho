# CLAUDE.md — thesis / paper work

Rules for writing the bachelor's thesis this repo supports. Read this before producing any paper prose, section text or diagram spec.

## The work

**«Система підтримки віддаленої роботи психолога»** — bachelor's thesis, Cherkasy National University, ОП "Програмна інженерія", supervisor ст. викл. Порубльов І.М.

- Methodology and formatting rules: `requirements.md` at the repo root (ДСТУ 3008:2015 + faculty rules). A similar reference thesis is in `example.md`.
- **`paper2.md`** (repo root) is the current working copy. The **Google Doc** held by Artem is the master. `paper.md` is the deleted old version; `action-plan-v2.md` audits that old file and is partially outdated — consult with care.
- **Code is authoritative** when it conflicts with the paper text. Verify facts against `backend/` and `frontend/` before writing them.

## Delivery format

Finished Ukrainian prose goes into `docs/sections/`, one file per section, named after the section number and a transliterated title (`3.4-fizychna-model-bd.md`). Artem pastes each file straight into the Google Doc.

Because it is pasted into Google Docs, section text must be **plain text only**:

- No page-break markers of any kind — no `\f`, `\pagebreak`, `<!-- pagebreak -->`, no horizontal-rule `---` separators.
- No Markdown formatting markers — no `#` headings, no `**bold**`, no `>` blockquotes, no backticks. Keep the words, drop the markers.
- No odd or special symbols.
- **No hard wrapping.** Each paragraph and each list item is a single continuous line; separate them with a blank line only. Mid-paragraph line breaks turn into stray breaks in Google Docs.

## Diagrams

When asked to draw, make or create a diagram, the deliverable is a **textual specification**, not an `.excalidraw` file and not an image. Artem builds the diagram himself in a drawing tool; the auto-generated excalidraw output was poor and is not wanted. Do not invoke the excalidraw skill or write `.excalidraw` files unless he explicitly asks for that format, and never render or export PNG/SVG — he opens the files himself.

Specs live in `docs/diagrams/specs/`. A spec must contain:

1. **All actors / lanes** — every actor (психолог, клієнт, гість, система) and what each represents.
2. **Action items** — for each node, box or decision, what it does or which condition it tests.
3. **Connections** — explicitly, what connects to what, arrow direction, arrow labels (Так/Ні branches), and whether the arrow crosses actors or lanes.

Group by actor/lane, then list nodes, then the arrow/flow list, so it is easy to translate into a drawing. Verify against code first, and present the spec for review before treating it as done.

## Locked decisions

- The paper keeps **«сесія»** for consultations (confirmed 2026-07-08) — this reverses decision D3 in `action-plan-v2.md`.
- **Three actors**: психолог, клієнт, гість (a transient pre-role state) — not the 2-actor framing from action-plan D9.
- The 23 functional requirements **stay in Додаток В** (too large for the body); §2.4 summarizes and points to it.
- **Chapter 1 keeps its current structure** (decided 2026-07-08): the technology overview belongs in chapter 3, and §1.4 «Аналіз підґрунтя» is skipped. Постановка stays §1.4. No renumbering in chapter 1, despite the methodology listing it.
- **No approbation** (no publications) — omit it from ВСТУП and ВИСНОВКИ.
- Chapter 3 title fix: ОНЛАЙН → ВІДДАЛЕНОЇ.

## Appendix letters

| Letter | Diagram | Section |
| --- | --- | --- |
| И | package diagram | §2.5 |
| К | whiteboard activity | §2.6.1 |
| Л | conceptual ER | §2.6.5 |
| М | logical DB | §2.6.6 |
| Н | structural scheme | ch. 3 |
| П | physical DB | §3.4 |
| Р | code listings | ch. 3 |

Додаток Г (the component-style diagram) is reused as the refined architecture in §2.7.

The **И** package diagram was reworked 2026-07-09: each server layer now nests the 11 business-domain packages from `backend/src/features/`; the routes layer has 10 (notifications has no routes — it is cron-driven); arrows go layer to layer except cron → Сервіс сповіщень and Сервіс файлів → Файлове сховище. That spec file ends with a paste-ready English LLM generation prompt.

## Verified code facts

Checked against the codebase — use these rather than re-deriving:

- **Reminders are implemented**: `email_outbox` + `Bun.cron`, decision tick every 10 min, sender tick every 1 min. `session_reminder` at 24h and 1h; `rec_reminder` at 2 days and 1 day.
- **Whiteboard**: Excalidraw 0.18 over WebSocket (hono/bun), one room per appointment, debounced 3s save to JSONB on `appointments`, PNG snapshot on end.
- **Appointment status is derived**, not stored — upcoming / active / past / warning / missed, computed from `started_at`, `ended_at` and the scheduled times.

## Chapter state

Point-in-time as of **2026-07-08/09** — verify against `docs/sections/` before relying on it.

- **Chapter 1**: structure settled (see locked decisions).
- **Chapter 2**: prose delivered into `docs/sections/` — 2.4 and 2.6.4 fixes, 2.5 rewrite with pattern justification ([9] = Fowler), 2.6.1, 2.6.5, 2.6.6, 2.7, both chapter conclusions, bibliography additions, abbreviations.
- **Chapter 3**: plan in `docs/chapter-3-plan.md` (structure 3.1–3.7). Delivered: §3.1 `3.1-vybir-mov-ta-tekhnolohii.md` (final — replaces the deleted material file, drops the stub 3.1.1/3.1.2, adds the no-ORM rationale and Brevo [23]) and §3.4 `3.4-fizychna-model-bd.md` with spec `dodatok-P-physical-db.md`. **Still pending: 3.2, 3.3.x, 3.5, 3.6 (needs Artem's screenshots), 3.7, the chapter conclusion, and ВИСНОВКИ.**
- The class-diagram adaptation in 3.5 needs supervisor sign-off.
