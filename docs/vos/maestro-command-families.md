# Maestro Command Families v0.1

## Purpose

Command families group the language into stable operating domains.

They answer:

* what kinds of commands exist
* which commands belong together
* what each family is for
* which families are globally available
* which families are mode- or surface-specific
* which commands are core versus extended

This is how Maestro becomes teachable, documentable, and buildable.

---

# 1. First law of command families

## Each family should correspond to a real operating intention, not just a UI category

That means families should not be arbitrary buckets like:

* "miscellaneous"
* "editor stuff"
* "desktop stuff"

Instead they should reflect real user intentions like:

* stop
* switch mode
* move focus
* navigate
* select
* execute
* search
* inspect
* explain

That makes the language coherent.

---

# 2. The official family set v0.1

I would define these twelve command families.

## Core families

1. Reflex
2. Mode
3. Focus
4. Navigation
5. Selection
6. Execution
7. Search
8. Visibility

## Domain families

9. Coding
10. Browser
11. Terminal
12. System

## Bridge family

13. Cognitive Bridge

That is the right starting set.

---

# 3. Family 1: Reflex

## Purpose

Immediate interruption, recovery, and control.

## Properties

* globally available
* highest priority
* shortest commands
* never overloaded
* should work even under uncertainty

## Canonical commands

* stop
* cancel
* undo
* redo
* mute
* unmute
* pause
* resume
* sleep
* wake
* yes
* no

## Notes

This family is sacred.
Nothing else should compete with it.

---

# 4. Family 2: Mode

## Purpose

Change how Maestro interprets speech and what kinds of actions are enabled.

## Canonical commands

* enter command mode
* enter coding mode
* enter browser mode
* enter terminal mode
* enter dictation
* leave dictation
* enter secure mode
* leave secure mode
* enter quiet mode
* leave quiet mode
* switch to conversation

## Notes

Mode commands should be globally available, though some may be policy-gated.

---

# 5. Family 3: Focus

## Purpose

Move operating attention between surfaces and restore prior control context.

## Canonical commands

* focus terminal
* focus editor
* focus browser
* focus explorer
* focus problems
* focus sidebar
* focus left pane
* focus right pane
* focus panel
* return focus
* previous focus
* swap focus

## Extended commands

* focus integrated terminal
* focus external terminal
* focus command palette
* focus quick open

## Notes

Focus is one of the foundational Maestro families.
This is where VOS identity really shows.

---

# 6. Family 4: Navigation

## Purpose

Move through ordered structures, locations, and viewports.

## Canonical commands

* next tab
* previous tab
* next error
* previous error
* next result
* previous result
* go line 42
* go top
* go bottom
* move pane right
* move tab left
* scroll down
* scroll up
* scroll page top
* scroll page bottom

## Notes

Navigation should stay highly deterministic.
It is one of the most universal families.

---

# 7. Family 5: Selection

## Purpose

Create, modify, or act on explicit selections.

## Canonical commands

* select line 42
* select current line
* select function parse input
* select symbol token map
* select first result
* select current file
* copy selection
* paste here
* delete line
* rename symbol
* comment line
* uncomment line

## Extended commands

* select lines 10 through 20
* select next word
* select current block
* copy file path

## Notes

Selection is the bridge between navigation and editing.

---

# 8. Family 6: Execution

## Purpose

Run processes, tasks, builds, tests, and other actuation-bearing commands.

## Canonical commands

* run cargo build
* run cargo test
* run command
* build project
* build api
* test file
* test project
* stop process
* stop build
* show logs
* clear terminal

## Extended commands

* run cargo build in terminal
* build project and return
* test current file quietly
* run tests in integrated terminal

## Notes

Execution is one of the most important families in Maestro because it turns speech into real system action.

---

# 9. Family 7: Search

## Purpose

Find, retrieve, and locate content across scopes.

## Canonical commands

* search files auth token
* search project logger
* search page authentication
* search logs timeout
* find auth
* find next match
* find token in file

## Extended commands

* search docs websocket
* search symbols parse input
* search current file for config

## Notes

Search is a perfect family for chooser-driven disambiguation and preference learning.

---

# 10. Family 8: Visibility

## Purpose

Reveal or hide views, panels, overlays, and contextual surfaces.

## Canonical commands

* open terminal
* open file
* open settings
* open definition
* close tab
* close panel
* close window
* show explorer
* show problems
* show logs
* hide sidebar
* hide panel

## Notes

Visibility is adjacent to focus, but not identical.
This distinction should remain sharp.

---

# 11. Family 9: Coding

## Purpose

Language-aware, symbol-aware, and editor-aware software creation commands.

## Canonical commands

* open definition
* select function parse input
* rename symbol token map
* next error
* previous error
* extract method
* comment line
* uncomment line
* test file
* compare these files
* inspect symbol
* explain this function

## Extended commands

* find references
* open references
* format file
* stage hunk
* run formatter
* open implementation
* open type definition

## Notes

Coding is where Maestro becomes much more than dictation.

---

# 12. Family 10: Browser

## Purpose

Structured control of web content and browser surfaces.

## Canonical commands

* focus browser
* open first result
* click second link
* next heading
* previous heading
* search page websocket
* open tab
* close tab
* next tab
* previous tab
* scroll page top

## Extended commands

* open result in new tab
* click search field
* inspect page
* show downloads

## Notes

Browser commands should prefer semantic automation paths where available.

---

# 13. Family 11: Terminal

## Purpose

Terminal- and shell-specific operation.

## Canonical commands

* focus terminal
* run cargo build
* run cargo test
* stop process
* clear terminal
* show logs
* inspect process
* previous command
* next command
* copy command

## Extended commands

* run server
* stop server
* run tests quietly
* open external terminal
* focus integrated terminal

## Notes

The terminal family is important enough that integrated vs external terminal distinctions should be respected explicitly.

---

# 14. Family 12: System

## Purpose

OS-level and workspace-level control beyond app-specific domains.

## Canonical commands

* open browser
* open terminal
* open settings
* switch workspace
* close window
* move window left
* move window right
* maximize window
* minimize window
* lock screen
* show notifications

## Extended commands

* switch monitor
* focus dock
* open system settings

## Notes

This family is where Talon and other broad actuation layers will matter a lot.

---

# 15. Family 13: Cognitive Bridge

## Purpose

Escalate from operating control into explanation, comparison, analysis, and planning.

## Canonical commands

* explain this error
* explain this function
* compare these files
* compare these modules
* inspect selection
* inspect session
* summarize changes
* prepare my workspace
* refactor this safely

## Notes

This family is the bridge into the cognitive lane.
It should not swallow the whole language.

---

# 16. Family availability rules

Not every family should be available equally everywhere.

## Always available

* Reflex
* Mode
* Focus

## Broadly available

* Navigation
* Visibility
* Search

## Context-dependent

* Selection
* Execution
* Coding
* Browser
* Terminal
* System

## Policy-dependent / lane-dependent

* Cognitive Bridge

This helps keep the parser sane.

---

# 17. Family precedence

When multiple families could claim a command, precedence matters.

## Precedence order

1. Reflex
2. Mode
3. Focus
4. Visibility
5. Navigation
6. Selection
7. Execution
8. Domain families
9. Cognitive Bridge
10. Dictation fallback

This means:

* "open terminal" stays visibility/focus-related
* "run cargo build" stays execution
* "explain this error" goes cognitive bridge
* "stop" always wins

---

# 18. Family identity examples

This is a good way to keep boundaries clear.

## "focus terminal"

Family: Focus

## "open terminal"

Family: Visibility

## "run cargo build"

Family: Execution / Terminal

## "next tab"

Family: Navigation

## "select line 42"

Family: Selection

## "search files auth token"

Family: Search

## "rename symbol token map"

Family: Coding / Selection

## "open first result"

Family: Browser / Visibility

## "explain this error"

Family: Cognitive Bridge

These boundaries matter.

---

# 19. First 75 canonical commands by family

Here is a very strong first inventory.

## Reflex

1. stop
2. cancel
3. undo
4. redo
5. mute
6. unmute
7. pause
8. resume
9. sleep
10. wake

## Mode

11. enter coding mode
12. enter browser mode
13. enter terminal mode
14. enter dictation
15. leave dictation
16. enter secure mode
17. leave secure mode
18. enter quiet mode
19. leave quiet mode

## Focus

20. focus terminal
21. focus editor
22. focus browser
23. focus explorer
24. focus problems
25. focus sidebar
26. focus panel
27. focus left pane
28. focus right pane
29. return focus
30. previous focus
31. swap focus

## Navigation

32. next tab
33. previous tab
34. next error
35. previous error
36. next result
37. previous result
38. go line 42
39. go top
40. go bottom
41. move tab right
42. move pane left
43. scroll down
44. scroll page top

## Selection

45. select line 42
46. select current line
47. select function parse input
48. select symbol token map
49. select first result
50. copy selection
51. paste here
52. delete line
53. rename symbol
54. comment line
55. uncomment line

## Execution

56. run cargo build
57. run cargo test
58. build project
59. build api
60. test file
61. test project
62. stop process
63. stop build
64. show logs
65. clear terminal

## Search

66. search files auth token
67. search page websocket
68. search project logger
69. search logs timeout
70. find auth
71. find next match

## Visibility

72. open terminal
73. open file
74. open settings
75. close panel

That is already a highly respectable v0.1 command language.

---

# 20. Family growth policy

We should not let families sprawl uncontrollably.

## Rule 1

New commands should enter an existing family unless a truly new intention class appears.

## Rule 2

A new family should only be created if:

* it has distinct semantics
* it has multiple canonical verbs/objects
* it changes parsing or policy meaningfully

## Rule 3

Family names should stay stable even as internal commands expand.

This keeps the language elegant.

---

# 21. The most important design insight here

The command families show that Maestro is not one flat command table.

It is a **layered operating language** composed of:

* control primitives
* attention movement
* object manipulation
* execution
* domain-specific action
* cognitive escalation

That is exactly what a real VOS language should look like.

---

# 22. What comes next

At this point, the language architecture is already very strong.

We now have:

* constitution
* parse lanes
* verbs
* objects
* legality matrix
* surfaces
* interpretation engine
* personalization
* chooser UX
* command families
