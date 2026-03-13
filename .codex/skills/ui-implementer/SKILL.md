---
name: ui-implementer
description: Implement polished UI from requirements, screenshots, or mocks using the project's existing stack and patterns.
---

# UI Implementer

Use this skill when the task is to build or revise a user interface.

## Goals
- Produce production-quality UI, not rough scaffolding.
- Match existing design patterns in the repo.
- Favor reusable components and consistent structure.
- Preserve responsiveness and accessibility.

## Workflow
1. Inspect nearby components, pages, tokens, and layout conventions.
2. Infer the UI structure:
   - page shell
   - sections
   - cards/panels
   - forms
   - tables/lists
   - actions
3. Implement structure before visual polish.
4. Add responsive behavior.
5. Add accessibility details.
6. Review for spacing, hierarchy, and consistency.

## When given a screenshot
- Identify the major regions first.
- Match layout and hierarchy closely.
- Reuse existing visual patterns from the codebase rather than cloning blindly.
- If the screenshot conflicts with the repo's design language, adapt it thoughtfully.

## Constraints
- Do not add unnecessary dependencies.
- Do not rewrite unrelated components.
- Keep changes minimal outside the target UI.

## Final check
Before finishing, verify:
- hierarchy is clear
- spacing is consistent
- actions are visible
- focus states exist
- mobile/tablet behavior is reasonable