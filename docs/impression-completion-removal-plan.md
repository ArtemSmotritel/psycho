# Impression completion: paper changes by section

Scope: remove every mention of `impression_completions` / `ImpressionCompletion` from the paper and from the diagrams that the paper uses. Each diagram sits with the section that uses it. Line numbers refer to `paper.md` at the time of writing and will shift as changes apply.

Not checked: `classes.drawio.png` (an image, so I could not search it).

## 2.6.3 Керування вкладеннями (lines 459–474)

Text:

- [ ] Line 466: remove "та один раз доповнювати власне враження".
- [ ] Line 470: in delete rule 2, remove "і враження, яке вже має відповідь". Rule 2 then covers recommendations only.

Diagrams:

- [ ] `docs/diagrams/attachment-use-cases.drawio` and `.puml`: remove the use case "Залишити відповідь на враження (один раз)" (`IC` in the `.puml`).
- [ ] `docs/diagrams/attachment-use-cases.drawio`: in the constraints note, remove "враження з відповіддю клієнта видалити не можна".
- [ ] `docs/diagrams/attachment-state-machine.puml`: remove the transition `відповісти() (враження)` (`PATCH /attachments/{id}/complete`). Remove the terminal state `i2` and its note.
- [ ] Confirm that the state machine belongs to this section. The paper does not name it.

## 2.6.6 Концептуальна модель БД (lines 498–509)

Text:

- [ ] Line 507: change "Дві допоміжні сутності" to "Одна допоміжна сутність". Remove the sentence about "Виконання враження" (ImpressionCompletion).
- [ ] Line 518: remove `ImpressionCompletion` from the one-to-one relation sentence. Remove the clause "а враження – щонайбільше одну відповідь клієнта".

Diagram (Рисунок 2.6):

- [ ] `docs/diagrams/specs/dodatok-L-conceptual-er.md` line 26: remove the `ImpressionCompletion` entity and its link.

## 2.6.7 Даталогічна модель БД (lines 510–520)

Text: no mention.

Diagram (Рисунок 2.7):

- [ ] `datalogical.drawio` line 247: remove the table `t12` and its relation edges.
- [ ] `docs/diagrams/db-logical.txt`: remove the table at line 119 and the `Ref` at line 209.
- [ ] `docs/diagrams/specs/dodatok-M-logical-db.md`: remove lines 25 and 43 (the table and the 1—1 relation).

## 3.3.4 Реалізація бази даних (lines 619–859)

Text:

- [ ] Line 794: remove the paragraph on `impression_completions`. It also wrongly says "психолога".
- [ ] Lines 796–802: remove Table 3.13.
- [ ] Renumber Tables 3.14 to 3.17 as 3.13 to 3.16 (lines 806, 819, 832, 853).
- [ ] Update the in-text references to those tables.

Diagram:

- [ ] `docs/diagrams/specs/dodatok-P-physical-db.md`: remove lines 41 and 63. The paper has no physical-model appendix, so this spec is the only diagram here.

## 3.6 Тестування (lines 913–935)

Depends on the renumbering in 3.3.4. Apply the two together.

- [ ] Line 917: Table 3.18 becomes Table 3.17.
- [ ] Update the in-text references to that table.

## Додаток Г – Функціональні вимоги

- [ ] Line 1045, requirement 15: remove "Клієнт може надати відповідь до враження.", "Враження, яке вже має відповідь, видалити не можна." and "Відповідь є одноразовою."

## Додаток Н – Результати тестування

- [ ] Line 1130, requirement 15: remove "та відповідь клієнта на запит враження (impression completion)".

## Order

Apply 3.3.4 and 3.6 together. All other groups are independent.
