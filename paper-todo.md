# Paper TODO — Terminology and Model Fixes

Action points for editing `paper.md`. Each item is a targeted change to align the paper
with the actual implementation decisions.

---

## 1. Replace session terminology throughout

**Problem**: `paper.md` uses "сесія" / "сеанс" (session) for the product concept of a
scheduled appointment between psychologist and client. The codebase uses "appointment"
everywhere (Decision 3 in linear-tickets.md) to avoid collision with the `better-auth`
`session` object.

**Action**: Replace all occurrences of "сесія" / "сеанс" used as the product concept
with a consistent Ukrainian term. Recommended term: **"прийом"** (lit. "appointment" /
"consultation"). Alternative: **"зустріч"** ("meeting"). Pick one and apply globally.

**Scope**: All sections of `paper.md` — ВСТУП, РОЗДІЛ 1, РОЗДІЛ 2, РОЗДІЛ 3, ВИСНОВКИ.
Do not replace "сесія" when it refers to auth/HTTP session context (e.g., "сесія
користувача" in an auth context).

---

## 2. Fix registration model description in section 1.5 (Постановка задачі)

**Problem**: The current section 1.5 (Постановка задачі) describes a model where the
psychologist registers clients. The actual app uses self-registration: both roles sign up
independently via Google OAuth. A client only gains access to a psychologist's workspace
after the psychologist adds them (by email) and the link is established.

**Action**: Update section 1.5 to describe the actual flow:
- Both psychologist and client self-register via Google OAuth.
- After registration, the client selects their role ("Клієнт").
- The psychologist adds the client to their workspace by entering the client's email.
- The client then gains access to the psychologist's appointments and content.

Remove any language implying the psychologist creates accounts for clients.

---
