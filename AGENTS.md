# AGENTS.md

## Mission
Build polished, production-ready interfaces with strong UX, clear hierarchy, and clean implementation.

## Current Product Priority

For current Maestro work, these rules override generic UI defaults:

- Arqon Maestro is the Voice Operating System for Arqon, not a generic assistant UI.
- The current Electron-era UI is not the long-term design authority.
- Do not preserve legacy product patterns if they conflict with the new operator-shell direction.
- The new desktop GUI must be shell-portable and prepared for Tauri migration.
- Avoid introducing Electron-specific renderer assumptions into new UI architecture.
- Prioritize the operator experience of the live voice loop:
  - listening
  - transcript
  - interpretation
  - execution state
  - spoken response
  - runtime health
- Kokoro-backed two-way voice interaction is a flagship short-term product experience.
- Prefer durable architectural seams over quick UI-only wins.
- Do not use placeholders, fake states, or speculative controls to imply missing backend capability.

## Instruction Precedence

When UI guidance conflicts, use this order:

1. Maestro Master Plan
2. active architecture and operations constraints
3. this AGENTS.md
4. local UI skills
5. existing legacy UI patterns

## Stack defaults
- Prefer React + TypeScript when the repo already uses them.
- Prefer Tailwind CSS when the repo already uses it.
- Reuse existing components, tokens, and patterns before creating new ones.
- Do not introduce new dependencies unless clearly necessary.

## Design principles
- Prioritize clarity, hierarchy, consistency, and speed of comprehension.
- Prefer elegant, modern, technical UI over playful or decorative UI unless requested.
- Preserve a strong spacing rhythm and visual balance.
- Favor dense-but-readable layouts for power users when appropriate.
- Minimize friction and unnecessary clicks.

## UX rules
- Important actions must be obvious.
- Navigation should be predictable.
- Forms should give immediate feedback.
- Empty states, loading states, and error states should be handled intentionally.
- Keyboard use should remain first-class.

## Accessibility
- Use semantic HTML.
- Ensure labels, roles, focus states, and ARIA where needed.
- Do not rely only on color.
- Maintain strong contrast.
- Preserve keyboard navigation and visible focus indicators.

## Implementation rules
- Keep edits localized and aligned with the existing codebase.
- Match the project's naming conventions and structure.
- When building a UI from a screenshot or mock, first infer layout regions, hierarchy, reusable primitives, and responsive behavior.
- Then implement structure first, styling second, polish third.

## Review behavior
When asked to improve a UI:
1. Identify hierarchy problems.
2. Identify spacing and alignment problems.
3. Identify interaction and accessibility problems.
4. Propose the smallest high-impact improvements first.

## Output behavior
- Explain design decisions briefly and concretely.
- When tradeoffs exist, state them.
- Do not overengineer simple UI.