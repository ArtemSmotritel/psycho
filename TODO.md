# TODO

## 1. Remove impression completion from the paper and from the code

Reason: no screen lets a user add or see a completion. Only the backend route and table exist.

### Paper (`paper.md`)

- [ ] Line 428: remove "і враження, яке вже має відповідь" from the delete rule.
- [ ] Line 454: remove the `ImpressionCompletion` entity sentence. Change "Дві допоміжні сутності" to one entity.
- [ ] Line 463: remove `ImpressionCompletion` from the one-to-one relation sentence.
- [ ] Lines 695–703: remove the `impression_completions` paragraph and Table 3.13. Renumber the later tables.
- [ ] Line 884: remove "Враження, яке вже має відповідь, видалити не можна. Відповідь є одноразовою."
- [ ] Line 931: remove "та відповідь клієнта на запит враження (impression completion)".
- [ ] Check the diagrams (class diagram, ER diagram, appendix) for `ImpressionCompletion`.
- [ ] Check the list of tables and the table count in chapter 3.

### Backend (`backend/src/`)

- [ ] `features/attachments/client-routes.ts`: remove `completeSchema` and the `/:attachmentId/complete` route.
- [ ] `features/attachments/services.ts`: remove `completeImpressionForClient` and the `completeImpression` wiring.
- [ ] `features/attachments/repo.ts`: remove `insertImpressionCompletion` and the `LEFT JOIN impression_completions` joins.
- [ ] `features/attachments/models.ts`: remove the `ImpressionCompletion` type and the `completion` fields.
- [ ] `features/attachments/attachment-check.ts`: remove the `completion` parameter and the `ImpressionHasCompletion` delete rule.
- [ ] Add a migration that drops the table `impression_completions`.
- [ ] `test-fixtures/db.ts`: remove `impression_completions` from the table list.
- [ ] Tests: delete `impression-completion-routes.test.ts`. Remove completion cases from `attachment-routes.test.ts`.

### Frontend (`frontend/app/`)

- [ ] `models/attachment.ts`: remove `ImpressionCompletion` and `AttachmentWithCompletion`. Use `Attachment` for impressions.
- [ ] `services/attachment.service.ts`: remove `completion` from the response type. Remove the `ImpressionHasCompletion` error message.
- [ ] `hooks/useCurrentClientAttachment.ts`: remove `completion`.
- [ ] Frontend tests: remove completion data from fixtures.

### Docs

- [ ] Update or remove the notes about "B-9" and impression completion in `docs/`.

### Check

- [ ] Run `bun run typecheck` in `backend/` and `frontend/`.
- [ ] Run the backend and frontend tests.
- [ ] Search the whole repo for `completion`, `impression_completions` and `ImpressionHasCompletion`. Expect no match.


 **H** (package 10, line 374; also 2.6.4 and 3.3.2) The code sends a fourth e-mail type, `rec_created` ("Ваш психолог додав нову рекомендацію"), when a psychologist creates a recommendation (`attachments/services.ts:71` calls `NotificationsService.enqueueRecCreated`; template in `notifications/templates.ts`). The paper never mentions it, not in 2.5.1, 2.6.4, 3.3.2, FR 17 or appendix Л row 17. Add it, or remove the feature. - Remove)


- **M** FR 22 (line 971) "Історія сесій … зберігається". After unlinking, the psychologist cannot read the history through the application: `ensureLinked` rejects the client, and the lists filter on `disconnected_at IS NULL`. The data stays in the database and returns after re-linking. State this.  disconnectedAt doesn't work as intended
