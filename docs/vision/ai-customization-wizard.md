# The Self-Customizing OS: LLM-Fronted Customization Wizard

## 1. Position in the Product

The customization wizard is a primary adoption and differentiation lever for Maestro.

Its role is to turn customization from scripting into conversation while preserving strict governance.

## 2. Source-of-Truth Boundary

The LLM wizard is **not** runtime authority. It is a designer and maintainer of **structured Maestro customization assets**.

- LLM role: discover, draft, and explain customizations
- Command platform role: compile, validate, enforce grammar/policy, and execute safely

The command lane remains the source of truth.

## 3. Governance Loop (Required)

All wizard-driven changes follow this sequence:

1. observe
2. propose
3. preview structured assets
4. operator approve
5. install through compiler/runtime gates

No silent self-modification is allowed in command-lane authority paths.

## 4. Core Wizard Capabilities

### 4.1 Intent Architect

Converts natural requests into structured command assets (grammar slots, aliases, workflows, policy metadata).

### 4.2 Maintenance Gardener

Finds collisions, dead bindings, and stale commands, then proposes controlled repairs.

### 4.3 Workflow Watcher

Learns from opt-in behavior and proposes reusable macros/workflows from repeated operator patterns.

### 4.4 Safety Protector

Enforces passkey/risk gating and policy-safe install boundaries for high-impact mutations.

## 5. Talon Migration and Asset Import

Wizard-assisted migration must support:

- Talon asset discovery/import path
- mapping Talon constructs into Maestro structured assets
- compatibility reports for unsupported actions
- side-by-side preview before activation

Goal: remove the Talon/Serenade scripting barrier without losing power.

## 6. Command-Lane Integration Rules

Wizard output must compile directly into command-lane assets:

- lexicon/pronunciation updates
- grammar/alias updates
- workflow templates
- policy metadata

Generated assets must be inspectable, reversible, and auditable.

## 7. Strategic Outcome

The wizard turns Maestro from "powerful but hard" into "operator-grade and learnable" while preserving deterministic command governance.
