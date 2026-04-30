# Reflection

> **Required.** Fill in all sections before submitting. A blank or incomplete REFLECTION.md will significantly affect your evaluation.

---

## 1. Architectural Decisions

Describe **3 architectural decisions** you made. For each, explain:

- What the decision was
- What alternatives you considered
- The trade-off you accepted
- What you would change with more time

**Decision 1: [Name your decision]**

_Context:_ I need to make recipe list page which including search and pagination.

_Options considered:_

1. Create UI and the logic in the same place for quick development

2. Separate the logic and UI for better and more maintainable.

_Decision and trade-offs:_ I make it in the same place. I choose that for quick development. But it makes the code less maintainable. Moreover if the code grows bigger.

_With more time I'd:_ I will split the logic and the UI component. like using custom hooks.

---

**Decision 2: [Name your decision]**

_Context:_

_Options considered:_

_Decision and trade-offs:_

_With more time I'd:_

---

**Decision 3: [Name your decision]**

_Context:_

_Options considered:_

_Decision and trade-offs:_

_With more time I'd:_

---

## 2. Bugs Found in the Scaffold

If you noticed any issues in the existing scaffold code (before building your own feature), describe them here:

- **File and line**: src/app/recipes-example/page.tsx | line 65
- **Description**: Search result is not applied to the list
- **Fix applied**: I create new search component which applicable in the recipe list.

---

## 3. AI Tool Usage

Disclose every AI tool you used. Be specific.

| Tool        | Task(s)                                                                                                                                                                                                                                       | Representative prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | What you kept                                                                                 | What you changed or rejected |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| Claude Code | Implement recipe search and filtering in recipes-example: keyword search across recipe content, tag multi-select filter, difficulty filter, and enforce validation constraints for title uniqueness, total time, ingredients, tags, and steps | you are senior software engineer in here. here i have nextjs project using mongo as the db n using react query. in this page : src/app/recipes-example/page.tsx I have list of recipe. i want you to create these - Search recipes by keyword. Search should work across recipe content. - Filter recipes by tags (multi-select) and by difficulty. during this development, you also need to follow these rules: 1. Title must be unique — case-insensitive and after trimming whitespace 2. Total time must be valid — prepMin + cookMin must be greater than 0 and at most 1440 minutes (24 hours) 3. Ingredients — no duplicate ingredient names (case-insensitive); minimum 1 ingredient, maximum 50 4. Tags — maximum 5 tags; each tag must be 2–20 characters matching ^[a-z0-9-]+$ 5. Steps — each step must be 5–500 characters; maximum 30 steps | Mostly I kept. Because I prompt a specific requirement and AI does like what I need it to do. |                              |

_Why this matters: we're evaluating your judgment in working with AI tools, not whether you used them._

---

## 4. What I'd Improve Given More Time

List improvements you would make if you had additional time, in priority order:

1. Expand automated test coverage for critical paths: validation edge cases, search/filter combinations, and mutation flows (create/update/delete) to reduce regression risk.
2. Tidy up the code a little more. Since I think it's better to separate UI with logic. Example like creating custom hooks and call it in the UI component where it need.

---

## 5. Ambiguities I Encountered and How I Resolved Them

The spec was intentionally underspecified in a few places. For each ambiguity you encountered:

- **What was unclear**:
- **Decision I made**:
- **Reasoning**:

_(If you didn't encounter any ambiguities, revisit the spec — they are there.)_

---

## 6. Changes I Made to Scaffold Config

If you modified `tsconfig.json`, ESLint config, `next.config.ts`, `package.json` (adding/removing dependencies), or any other scaffold infrastructure file, document it here:

- **File changed**:
- **What changed**:
- **Reason**:

_(Leave blank if you made no changes to scaffold config files.)_
