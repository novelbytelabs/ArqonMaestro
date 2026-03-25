# Talon Compatibility and Migration Strategy

## 1. Strategic Goal

Talon migration is a major adoption rail for Maestro.

Objective: let advanced users preserve power while moving to a governed command platform with lower customization friction.

## 2. Migration Principle

Maestro does not import Talon as opaque scripts. It translates Talon assets into **structured Maestro assets** owned by the command platform.

## 3. Asset Mapping Scope

- `.talon` command/context files -> grammar slots, aliases, scoped intents
- spoken forms -> lexicon and pronunciation entries
- action bindings -> Maestro capability/action contracts
- reusable chains -> workflow templates

## 4. Wizard-Assisted Workflow

1. scan Talon workspace
2. analyze dependencies and unsupported APIs
3. propose translated structured assets
4. preview compatibility and risk notes
5. operator approve and install

This follows the same governance loop as native wizard customization.

## 5. Governance and Safety

- no silent import activation
- high-impact mappings require stronger confirmation
- unsupported behavior is surfaced explicitly
- every imported asset remains inspectable, reversible, and auditable

## 6. Command-Lane Source-of-Truth Integration

Imported assets compile through the same command-lane source-of-truth services:

- grammar/parser
- lexicon/pronunciation controls
- routing/policy/safety gates

Migration success means compatibility plus deterministic command safety.

## 7. Outcome

Talon compatibility is not a side feature. It is a strategic bridge that removes the "powerful but too hard" barrier while strengthening Maestro's command-platform moat.
