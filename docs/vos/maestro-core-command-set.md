# Maestro Core Command Set v0.1

This is the first **disciplined, buildable command surface** for Maestro.

It is not everything.
It is the first serious language slice that is:

* broad enough to feel real
* small enough to implement
* strict enough to support deterministic parsing
* safe enough to survive early runtime use

This set is designed to feed directly into:

* verb registry
* object registry
* alias registry
* legality matrix
* precedence table
* mode table
* phonetic hazard table
* parser skeleton

## Structure

I’m freezing this as **100 commands** across five groups:

* 20 reflex / mode / focus
* 30 operating / navigation
* 25 coding / browser / terminal
* 10 cognitive bridge
* 15 chooser / preference / repair

Each command includes:

* canonical spoken form
* aliases
* legality constraints
* example parse
* phonetic notes
* expert shorthand eligibility

---

# A. Reflex / Mode / Focus Commands (20)

## 1. stop

Canonical:
`stop`

Aliases:

* halt
* stop it

Legality:

* reflex lane
* global
* no object required
* may also target active process/playback implicitly

Example parse:

* lane: reflex
* verb: stop
* object: null
* scope: current active operation

Phonetic notes:

* short, somewhat risky
* sacred reflex word
* never overloaded

Expert shorthand:

* no

---

## 2. cancel

Canonical:
`cancel`

Aliases:

* never mind
* abort

Legality:

* reflex lane
* global
* cancels pending action, chooser, slot, or workflow

Example parse:

* lane: reflex
* verb: cancel
* object: current_pending_action

Phonetic notes:

* robust
* better than vague “no” outside overlay

Expert shorthand:

* no

---

## 3. undo

Canonical:
`undo`

Aliases:

* undo that

Legality:

* reflex/control lane
* global if undoable state exists

Example parse:

* lane: reflex
* verb: undo
* object: last_reversible_action

Phonetic notes:

* strong
* sacred word

Expert shorthand:

* no

---

## 4. redo

Canonical:
`redo`

Aliases:

* do that again

Legality:

* reflex/control lane
* only if redo state exists

Example parse:

* lane: reflex
* verb: redo
* object: last_undone_action

Phonetic notes:

* acceptable, slightly softer than undo

Expert shorthand:

* no

---

## 5. mute

Canonical:
`mute`

Aliases:

* mute audio
* quiet

Legality:

* reflex/control lane
* affects playback or voice output depending state

Example parse:

* lane: reflex
* verb: mute
* object: playback_or_voice

Phonetic notes:

* robust

Expert shorthand:

* no

---

## 6. unmute

Canonical:
`unmute`

Aliases:

* restore audio

Legality:

* reflex/control lane
* only meaningful if muted

Example parse:

* lane: reflex
* verb: unmute
* object: playback_or_voice

Phonetic notes:

* acceptable

Expert shorthand:

* no

---

## 7. pause

Canonical:
`pause`

Aliases:

* hold

Legality:

* reflex/control lane
* pauses playback, dictation, or active low-risk flow

Example parse:

* lane: reflex
* verb: pause
* object: current_active_stream

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 8. resume

Canonical:
`resume`

Aliases:

* continue

Legality:

* reflex/control lane
* resumes paused state

Example parse:

* lane: reflex
* verb: resume
* object: paused_stream

Phonetic notes:

* moderate, still acceptable

Expert shorthand:

* no

---

## 9. sleep

Canonical:
`sleep`

Aliases:

* go to sleep

Legality:

* mode/readiness lane
* explicit state change

Example parse:

* lane: mode
* verb: sleep
* object: maestro

Phonetic notes:

* good

Expert shorthand:

* no

---

## 10. wake

Canonical:
`wake`

Aliases:

* wake up

Legality:

* readiness/control
* explicit activation if wake-word flow allows

Example parse:

* lane: mode
* verb: wake
* object: maestro

Phonetic notes:

* acceptable, do not overload elsewhere

Expert shorthand:

* no

---

## 11. enter command mode

Canonical:
`enter command mode`

Aliases:

* command mode
* switch to command mode

Legality:

* mode lane
* explicit interaction-mode transition

Example parse:

* lane: mode
* verb: enter
* object: command_mode

Phonetic notes:

* strong multi-token form

Expert shorthand:

* maybe later, not v0.1

---

## 12. enter dictation

Canonical:
`enter dictation`

Aliases:

* start dictation
* switch to dictation

Legality:

* mode lane
* explicit interaction-mode change

Example parse:

* lane: mode
* verb: enter
* object: dictation_mode

Phonetic notes:

* strong enough

Expert shorthand:

* no

---

## 13. leave dictation

Canonical:
`leave dictation`

Aliases:

* stop dictation
* exit dictation

Legality:

* mode lane
* only valid when dictation active

Example parse:

* lane: mode
* verb: leave
* object: dictation_mode

Phonetic notes:

* robust because of phrase shape

Expert shorthand:

* no

---

## 14. enter coding mode

Canonical:
`enter coding mode`

Aliases:

* coding mode
* switch to coding mode

Legality:

* mode lane
* explicit domain mode change

Example parse:

* lane: mode
* verb: enter
* object: coding_mode

Phonetic notes:

* good

Expert shorthand:

* no

---

## 15. enter browser mode

Canonical:
`enter browser mode`

Aliases:

* browser mode
* switch to browser mode

Legality:

* mode lane
* explicit domain mode change

Example parse:

* lane: mode
* verb: enter
* object: browser_mode

Phonetic notes:

* good

Expert shorthand:

* no

---

## 16. enter terminal mode

Canonical:
`enter terminal mode`

Aliases:

* terminal mode
* switch to terminal mode

Legality:

* mode lane
* explicit domain mode change

Example parse:

* lane: mode
* verb: enter
* object: terminal_mode

Phonetic notes:

* terminal is acoustically fragile, phrase is still usable

Expert shorthand:

* no

---

## 17. enter secure mode

Canonical:
`enter secure mode`

Aliases:

* enable secure mode

Legality:

* mode/security lane
* explicit security posture change

Example parse:

* lane: mode
* verb: enter
* object: secure_mode

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 18. focus terminal

Canonical:
`focus terminal`

Aliases:

* activate terminal
* go to terminal
* switch to terminal

Legality:

* focus lane
* object must resolve to focusable terminal surface
* chooser if integrated/external ambiguous

Example parse:

* lane: focus
* verb: focus
* object: terminal(surface)

Phonetic notes:

* `terminal` is high-hazard; rely on context, alias shielding, preferences

Expert shorthand:

* `terminal` maybe later, expert-only

---

## 19. focus editor

Canonical:
`focus editor`

Aliases:

* activate editor
* go to editor
* switch to editor

Legality:

* focus lane
* editor surface must exist

Example parse:

* lane: focus
* verb: focus
* object: editor(surface)

Phonetic notes:

* strong

Expert shorthand:

* `editor` maybe later, expert-only

---

## 20. return focus

Canonical:
`return focus`

Aliases:

* previous focus
* go back to focus

Legality:

* focus lane
* requires valid prior focus context

Example parse:

* lane: focus
* verb: return
* object: focus

Phonetic notes:

* robust signature Maestro form

Expert shorthand:

* `return` maybe expert-only in strong context

---

# B. Operating / Navigation Commands (30)

## 21. open terminal

Canonical:
`open terminal`

Aliases:

* launch terminal
* show terminal

Legality:

* operating lane
* valid on terminal surface/container
* may reveal existing or instantiate new depending surface rules

Example parse:

* verb: open
* object: terminal(surface)

Phonetic notes:

* `open` moderate; object required

Expert shorthand:

* no

---

## 22. close panel

Canonical:
`close panel`

Aliases:

* hide panel
* dismiss panel

Legality:

* operating lane
* panel must exist and be closable

Example parse:

* verb: close
* object: panel(surface)

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 23. show sidebar

Canonical:
`show sidebar`

Aliases:

* open sidebar

Legality:

* operating lane
* sidebar surface exists or can be revealed

Example parse:

* verb: show
* object: sidebar(surface)

Phonetic notes:

* good

Expert shorthand:

* no

---

## 24. hide sidebar

Canonical:
`hide sidebar`

Aliases:

* close sidebar

Legality:

* operating lane
* visible sidebar required or no-op policy

Example parse:

* verb: hide
* object: sidebar(surface)

Phonetic notes:

* good

Expert shorthand:

* no

---

## 25. open settings

Canonical:
`open settings`

Aliases:

* show settings
* launch settings

Legality:

* operating lane
* settings surface or dialog supported

Example parse:

* verb: open
* object: settings(surface)

Phonetic notes:

* strong enough

Expert shorthand:

* no

---

## 26. close dialog

Canonical:
`close dialog`

Aliases:

* dismiss dialog
* close window if modal-context only

Legality:

* operating lane
* active overlay/dialog required

Example parse:

* verb: close
* object: dialog(overlay)

Phonetic notes:

* robust

Expert shorthand:

* no

---

## 27. next tab

Canonical:
`next tab`

Aliases:

* switch tab
* next browser tab in browser mode

Legality:

* navigation lane
* ordered tab set required

Example parse:

* verb: next
* object: tab(container)

Phonetic notes:

* `tab` somewhat fragile, strong pair shape helps

Expert shorthand:

* maybe later, not default

---

## 28. previous tab

Canonical:
`previous tab`

Aliases:

* last tab
* prior tab

Legality:

* navigation lane
* ordered tab set required

Example parse:

* verb: previous
* object: tab(container)

Phonetic notes:

* good

Expert shorthand:

* `prev tab` expert-only later

---

## 29. focus left pane

Canonical:
`focus left pane`

Aliases:

* go to left pane
* activate left pane

Legality:

* focus lane
* pane layout must exist

Example parse:

* verb: focus
* object: pane(container)
* qualifier: left

Phonetic notes:

* `pane` fragile; directional qualifier strengthens

Expert shorthand:

* no

---

## 30. focus right pane

Canonical:
`focus right pane`

Aliases:

* go to right pane
* activate right pane

Legality:

* focus lane
* pane layout must exist

Example parse:

* verb: focus
* object: pane(container)
* qualifier: right

Phonetic notes:

* acceptable due to phrase shape

Expert shorthand:

* no

---

## 31. split right

Canonical:
`split right`

Aliases:

* split pane right
* split to the right

Legality:

* operating lane
* current surface must support split

Example parse:

* verb: split
* object: current_pane
* qualifier: right

Phonetic notes:

* concise, survives well

Expert shorthand:

* maybe default eventually

---

## 32. split down

Canonical:
`split down`

Aliases:

* split below
* split pane down

Legality:

* operating lane
* surface must support vertical split

Example parse:

* verb: split
* object: current_pane
* qualifier: down

Phonetic notes:

* good

Expert shorthand:

* maybe later

---

## 33. go line 42

Canonical:
`go line 42`

Aliases:

* jump to line 42
* go to line 42

Legality:

* navigation lane
* editor-like surface or line addressable context required

Example parse:

* verb: go
* object: line(location)
* identifier: 42

Phonetic notes:

* `go` weak but saved by strong location phrase

Expert shorthand:

* no

---

## 34. scroll down

Canonical:
`scroll down`

Aliases:

* page down
* move down in scrollable view

Legality:

* navigation lane
* scrollable viewport required

Example parse:

* verb: scroll
* qualifier: down
* object: current_viewport

Phonetic notes:

* decent phrase

Expert shorthand:

* maybe later

---

## 35. scroll up

Canonical:
`scroll up`

Aliases:

* page up

Legality:

* navigation lane
* scrollable viewport required

Example parse:

* verb: scroll
* qualifier: up
* object: current_viewport

Phonetic notes:

* decent

Expert shorthand:

* maybe later

---

## 36. scroll top

Canonical:
`scroll top`

Aliases:

* go top
* page top

Legality:

* navigation lane
* scrollable surface required

Example parse:

* verb: scroll
* object: top(location)

Phonetic notes:

* okay

Expert shorthand:

* no

---

## 37. scroll bottom

Canonical:
`scroll bottom`

Aliases:

* go bottom
* page bottom

Legality:

* navigation lane
* scrollable surface required

Example parse:

* verb: scroll
* object: bottom(location)

Phonetic notes:

* okay

Expert shorthand:

* no

---

## 38. select current line

Canonical:
`select current line`

Aliases:

* select line
* highlight current line

Legality:

* selection lane
* line-addressable editor context required

Example parse:

* verb: select
* object: line(location)
* qualifier: current

Phonetic notes:

* strong enough

Expert shorthand:

* no

---

## 39. select lines 10 through 20

Canonical:
`select lines 10 through 20`

Aliases:

* highlight lines 10 through 20

Legality:

* selection lane
* line-range support required

Example parse:

* verb: select
* object: line_range(location)
* identifier: 10..20

Phonetic notes:

* long but explicit and safe

Expert shorthand:

* no

---

## 40. copy selection

Canonical:
`copy selection`

Aliases:

* copy that, only if strong bound selection exists
* copy current selection

Legality:

* manipulation lane
* active selection required

Example parse:

* verb: copy
* object: selection

Phonetic notes:

* good

Expert shorthand:

* maybe later in context only

---

## 41. paste here

Canonical:
`paste here`

Aliases:

* paste
* paste into current target

Legality:

* manipulation lane
* insertion target required
* `here` only allowed in strong bound insertion context

Example parse:

* verb: paste
* object: insertion_target
* postfix: here

Phonetic notes:

* `here` weak; only allow in strong context

Expert shorthand:

* `paste` yes in strong context

---

## 42. delete current line

Canonical:
`delete current line`

Aliases:

* remove current line
* erase line

Legality:

* manipulation lane
* line-addressable editable context required
* medium-risk, reversible

Example parse:

* verb: delete
* object: line
* qualifier: current

Phonetic notes:

* destructive verb, explicit object crucial

Expert shorthand:

* no

---

## 43. move line down

Canonical:
`move line down`

Aliases:

* move current line down

Legality:

* manipulation lane
* editable line context required

Example parse:

* verb: move
* object: line
* qualifier: down

Phonetic notes:

* good

Expert shorthand:

* no

---

## 44. move line up

Canonical:
`move line up`

Aliases:

* move current line up

Legality:

* manipulation lane
* editable line context required

Example parse:

* verb: move
* object: line
* qualifier: up

Phonetic notes:

* good

Expert shorthand:

* no

---

## 45. open file

Canonical:
`open file`

Aliases:

* open a file

Legality:

* operating lane
* requires slot prompt if file identifier missing

Example parse:

* verb: open
* object: file(entity)
* slot_missing: file_name

Phonetic notes:

* safe because slot-prompted when incomplete

Expert shorthand:

* no

---

## 46. open file main.rs

Canonical:
`open file main.rs`

Aliases:

* open main.rs
* load file main.rs

Legality:

* operating lane
* exact or fuzzy file binding required

Example parse:

* verb: open
* object: file
* identifier: main.rs

Phonetic notes:

* explicit, strong

Expert shorthand:

* maybe later, not default

---

## 47. close file

Canonical:
`close file`

Aliases:

* close current file

Legality:

* operating lane
* current file context required unless file specified

Example parse:

* verb: close
* object: file
* qualifier: current

Phonetic notes:

* fine

Expert shorthand:

* no

---

## 48. search files auth token

Canonical:
`search files auth token`

Aliases:

* search files for auth token
* look for auth token in files

Legality:

* search lane
* scoped query form
* files scope required

Example parse:

* verb: search
* object: files(scope)
* query: auth token

Phonetic notes:

* strong multi-token shape

Expert shorthand:

* no

---

## 49. search page websocket

Canonical:
`search page websocket`

Aliases:

* search page for websocket
* find websocket on page

Legality:

* search lane
* page/browser context required

Example parse:

* verb: search
* object: page(scope)
* query: websocket

Phonetic notes:

* robust

Expert shorthand:

* no

---

## 50. find auth

Canonical:
`find auth`

Aliases:

* find auth in current file
* find token if exact token spoken

Legality:

* discovery lane
* local-scope search only
* current searchable context required

Example parse:

* verb: find
* query: auth
* scope: current_local

Phonetic notes:

* short but okay in local mode

Expert shorthand:

* yes, default-safe

---

# C. Coding / Browser / Terminal Commands (25)

## 51. next error

Canonical:
`next error`

Aliases:

* go to next error
* next problem in coding mode

Legality:

* coding/navigation lane
* ordered error set required

Example parse:

* verb: next
* object: error(code_object)

Phonetic notes:

* strong pair

Expert shorthand:

* maybe later

---

## 52. previous error

Canonical:
`previous error`

Aliases:

* prior error

Legality:

* coding/navigation lane
* ordered error set required

Example parse:

* verb: previous
* object: error

Phonetic notes:

* strong

Expert shorthand:

* `prev error` expert-only later

---

## 53. open definition

Canonical:
`open definition`

Aliases:

* go to definition
* jump to definition

Legality:

* coding lane
* bound symbol context required
* best on editor/LSP surface

Example parse:

* verb: open
* object: definition(location)

Phonetic notes:

* strong enough

Expert shorthand:

* `definition` maybe later in very strong context only

---

## 54. open reference

Canonical:
`open reference`

Aliases:

* go to reference
* jump to reference

Legality:

* coding lane
* symbol context required
* may chooser if multiple references

Example parse:

* verb: open
* object: reference(location)

Phonetic notes:

* acceptable

Expert shorthand:

* no

---

## 55. rename symbol

Canonical:
`rename symbol`

Aliases:

* rename selected symbol
* change symbol name

Legality:

* coding lane
* symbol binding required
* slot prompt if target/new name missing

Example parse:

* verb: rename
* object: symbol(code_object)
* slot_missing: maybe new_name

Phonetic notes:

* safe enough

Expert shorthand:

* no

---

## 56. rename symbol token map to token index

Canonical:
`rename symbol token map to token index`

Aliases:

* change symbol token map to token index

Legality:

* coding lane
* symbol binding required
* explicit destination name required

Example parse:

* verb: rename
* object: symbol
* identifier: token_map
* destination: token_index

Phonetic notes:

* explicit and safe

Expert shorthand:

* no

---

## 57. select function parse input

Canonical:
`select function parse input`

Aliases:

* highlight function parse input

Legality:

* coding lane
* function symbol lookup required

Example parse:

* verb: select
* object: function
* identifier: parse_input

Phonetic notes:

* good shape

Expert shorthand:

* no

---

## 58. comment selection

Canonical:
`comment selection`

Aliases:

* comment out selection

Legality:

* coding lane
* active selection required

Example parse:

* verb: comment
* object: selection

Phonetic notes:

* avoid ambiguous compression with command/commands

Expert shorthand:

* no

---

## 59. uncomment selection

Canonical:
`uncomment selection`

Aliases:

* remove comment from selection

Legality:

* coding lane
* commented selection required

Example parse:

* verb: uncomment
* object: selection

Phonetic notes:

* okay

Expert shorthand:

* no

---

## 60. test file

Canonical:
`test file`

Aliases:

* run tests for file
* test current file

Legality:

* coding/terminal lane
* current file or explicit file target required

Example parse:

* verb: test
* object: file
* qualifier: current

Phonetic notes:

* solid

Expert shorthand:

* maybe later in coding mode only

---

## 61. test project

Canonical:
`test project`

Aliases:

* run project tests

Legality:

* execution lane
* project context required

Example parse:

* verb: test
* object: project

Phonetic notes:

* strong

Expert shorthand:

* maybe later

---

## 62. build project

Canonical:
`build project`

Aliases:

* compile project

Legality:

* execution lane
* project build context required

Example parse:

* verb: build
* object: project

Phonetic notes:

* good

Expert shorthand:

* maybe later

---

## 63. run cargo build

Canonical:
`run cargo build`

Aliases:

* execute cargo build

Legality:

* terminal/execution lane
* command payload allowed
* executor route required

Example parse:

* verb: run
* object: execution_payload
* payload: cargo build

Phonetic notes:

* strong because payload reinforces `run`

Expert shorthand:

* no

---

## 64. run cargo test

Canonical:
`run cargo test`

Aliases:

* execute cargo test

Legality:

* terminal/execution lane
* command payload allowed

Example parse:

* verb: run
* object: execution_payload
* payload: cargo test

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 65. run npm run dev

Canonical:
`run npm run dev`

Aliases:

* start npm dev server

Legality:

* terminal/execution lane
* payload command allowed

Example parse:

* verb: run
* object: execution_payload
* payload: npm run dev

Phonetic notes:

* longer but distinctive

Expert shorthand:

* no

---

## 66. show logs

Canonical:
`show logs`

Aliases:

* open logs
* reveal logs

Legality:

* terminal/browser/system lane
* log surface/view must exist or be creatable
* chooser if multiple log surfaces plausible

Example parse:

* verb: show
* object: logs

Phonetic notes:

* strong

Expert shorthand:

* maybe later in strong context

---

## 67. show logs in terminal

Canonical:
`show logs in terminal`

Aliases:

* open terminal logs

Legality:

* execution lane
* terminal scope explicit

Example parse:

* verb: show
* object: logs
* scope: terminal

Phonetic notes:

* good, explicit

Expert shorthand:

* no

---

## 68. clear terminal

Canonical:
`clear terminal`

Aliases:

* clear shell
* wipe terminal screen

Legality:

* terminal lane
* terminal surface required

Example parse:

* verb: clear
* object: terminal

Phonetic notes:

* `terminal` fragile, pair is still usable

Expert shorthand:

* no

---

## 69. stop process

Canonical:
`stop process`

Aliases:

* stop running process
* kill process, only if policy maps it

Legality:

* terminal/execution lane
* bound active process required or slot prompt

Example parse:

* verb: stop
* object: process

Phonetic notes:

* explicit object makes `stop` safer

Expert shorthand:

* no

---

## 70. focus browser

Canonical:
`focus browser`

Aliases:

* switch to browser
* activate browser

Legality:

* focus lane
* browser surface required

Example parse:

* verb: focus
* object: browser(surface)

Phonetic notes:

* browser moderate hazard, phrase okay

Expert shorthand:

* `browser` maybe expert-only later

---

## 71. open first result

Canonical:
`open first result`

Aliases:

* open result one
* open top result

Legality:

* browser/search lane
* ranked result list required

Example parse:

* verb: open
* object: result
* qualifier: first

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 72. click first result

Canonical:
`click first result`

Aliases:

* click result one

Legality:

* browser/UI lane
* clickable result object required

Example parse:

* verb: click
* object: result(ui_object)
* qualifier: first

Phonetic notes:

* acceptable

Expert shorthand:

* no

---

## 73. next heading

Canonical:
`next heading`

Aliases:

* go to next heading

Legality:

* browser/navigation lane
* heading structure required

Example parse:

* verb: next
* object: heading

Phonetic notes:

* good

Expert shorthand:

* maybe later

---

## 74. focus search field

Canonical:
`focus search field`

Aliases:

* activate search field
* go to search box

Legality:

* UI/focus lane
* field must exist

Example parse:

* verb: focus
* object: field(ui_object)
* qualifier: search

Phonetic notes:

* robust

Expert shorthand:

* no

---

## 75. open browser tab 2

Canonical:
`open browser tab 2`

Aliases:

* open tab two in browser
* focus browser tab two if semantics collapse that way in implementation

Legality:

* browser lane
* numbered tab set required

Example parse:

* verb: open
* object: tab
* scope: browser
* identifier: 2

Phonetic notes:

* numbers okay with parser normalization

Expert shorthand:

* no

---

# D. Cognitive Bridge Commands (10)

## 76. explain this error

Canonical:
`explain this error`

Aliases:

* explain error
* what is this error

Legality:

* cognitive lane
* strong bound error required

Example parse:

* lane: cognitive
* verb: explain
* object: error
* reference: this

Phonetic notes:

* strong phrase

Expert shorthand:

* no

---

## 77. explain function parse input

Canonical:
`explain function parse input`

Aliases:

* explain parse input function

Legality:

* cognitive lane
* function binding required

Example parse:

* verb: explain
* object: function
* identifier: parse_input

Phonetic notes:

* good

Expert shorthand:

* no

---

## 78. inspect selection

Canonical:
`inspect selection`

Aliases:

* inspect current selection
* inspect this selection

Legality:

* cognitive/deterministic bridge
* active selection required

Example parse:

* verb: inspect
* object: selection

Phonetic notes:

* robust

Expert shorthand:

* maybe later in strong context

---

## 79. inspect session

Canonical:
`inspect session`

Aliases:

* show session state
* inspect current session

Legality:

* cognitive/system bridge
* always legal if runtime supports session introspection

Example parse:

* verb: inspect
* object: session

Phonetic notes:

* good

Expert shorthand:

* no

---

## 80. inspect focus

Canonical:
`inspect focus`

Aliases:

* what is focused
* inspect current focus

Legality:

* cognitive/system bridge
* focus state required

Example parse:

* verb: inspect
* object: focus

Phonetic notes:

* good

Expert shorthand:

* no

---

## 81. compare these files

Canonical:
`compare these files`

Aliases:

* compare files
* diff these files

Legality:

* cognitive lane
* requires two bound file referents or slot prompt

Example parse:

* verb: compare
* object: files(pair_set)
* reference: these

Phonetic notes:

* good

Expert shorthand:

* no

---

## 82. compare modules auth and api

Canonical:
`compare modules auth and api`

Aliases:

* compare auth and api modules

Legality:

* cognitive lane
* dual object binding required

Example parse:

* verb: compare
* object: modules(pair_set)
* identifiers: auth, api

Phonetic notes:

* explicit and good

Expert shorthand:

* no

---

## 83. summarize today’s changes

Canonical:
`summarize today’s changes`

Aliases:

* summarize changes today
* what changed today

Legality:

* cognitive lane
* session/project/history source required

Example parse:

* verb: summarize
* object: changes
* scope: today

Phonetic notes:

* acceptable

Expert shorthand:

* no

---

## 84. prepare my workspace

Canonical:
`prepare my workspace`

Aliases:

* set up my workspace

Legality:

* cognitive lane
* may compile to workflow, not direct deterministic action
* confirmation if plan is large or destructive

Example parse:

* verb: prepare
* object: workspace
* reference: my

Phonetic notes:

* okay

Expert shorthand:

* no

---

## 85. refactor this safely

Canonical:
`refactor this safely`

Aliases:

* refactor selection safely
* refactor current function safely

Legality:

* cognitive lane
* strong referent required
* postfix/modifier `safely` active

Example parse:

* verb: refactor
* object: bound_target
* modifier: safely

Phonetic notes:

* good

Expert shorthand:

* no

---

# E. Chooser / Preference / Repair Commands (15)

## 86. one

Canonical:
`one`

Aliases:

* option one

Legality:

* chooser overlay only
* selects first ranked option

Example parse:

* lane: chooser
* verb: choose
* object: option_1

Phonetic notes:

* unsafe outside chooser, safe inside chooser

Expert shorthand:

* no

---

## 87. two

Canonical:
`two`

Aliases:

* option two

Legality:

* chooser overlay only

Example parse:

* lane: chooser
* verb: choose
* object: option_2

Phonetic notes:

* safe only in chooser

Expert shorthand:

* no

---

## 88. three

Canonical:
`three`

Aliases:

* option three

Legality:

* chooser overlay only

Example parse:

* lane: chooser
* verb: choose
* object: option_3

Phonetic notes:

* safe only in chooser

Expert shorthand:

* no

---

## 89. confirm

Canonical:
`confirm`

Aliases:

* yes confirm

Legality:

* confirmation overlay only
* approves pending action

Example parse:

* lane: chooser/confirmation
* verb: confirm
* object: pending_action

Phonetic notes:

* better than plain yes outside strict overlay

Expert shorthand:

* no

---

## 90. no

Canonical:
`no`

Aliases:

* decline

Legality:

* confirmation overlay only
* rejects pending action

Example parse:

* lane: confirmation
* verb: reject
* object: pending_action

Phonetic notes:

* high-hazard outside overlay, constrained here only

Expert shorthand:

* no

---

## 91. repeat

Canonical:
`repeat`

Aliases:

* say again
* repeat that

Legality:

* repair/control lane
* repeats last feedback, chooser, or prompt

Example parse:

* lane: repair
* verb: repeat
* object: last_feedback

Phonetic notes:

* strong

Expert shorthand:

* no

---

## 92. correct that

Canonical:
`correct that`

Aliases:

* correction
* that is wrong

Legality:

* repair lane
* opens correction flow on last parse/execution candidate

Example parse:

* lane: repair
* verb: correct
* object: last_command

Phonetic notes:

* solid

Expert shorthand:

* no

---

## 93. correct terminal

Canonical:
`correct terminal`

Aliases:

* no terminal
* I said terminal

Legality:

* repair lane
* substitutes corrected slot/object for last parse field

Example parse:

* lane: repair
* verb: correct
* object: terminal
* target_field: inferred from last_error_context

Phonetic notes:

* explicit correction phrase works well

Expert shorthand:

* no

---

## 94. use chooser next time

Canonical:
`use chooser next time`

Aliases:

* ask me next time
* do not guess next time

Legality:

* preference lane
* adjusts ambiguity policy for current pattern/context

Example parse:

* lane: preference
* verb: set_preference
* object: chooser_policy
* scope: current_context

Phonetic notes:

* long but safe

Expert shorthand:

* no

---

## 95. always use this here

Canonical:
`always use this here`

Aliases:

* remember this choice here
* make this default here

Legality:

* preference lane
* chooser or strong bound candidate required

Example parse:

* lane: preference
* verb: set_preference
* object: selected_candidate
* scope: current_context

Phonetic notes:

* good

Expert shorthand:

* no

---

## 96. prefer integrated terminal here

Canonical:
`prefer integrated terminal here`

Aliases:

* use integrated terminal here
* default to integrated terminal here

Legality:

* preference lane
* terminal surface candidate must be known

Example parse:

* lane: preference
* verb: prefer
* object: integrated_terminal
* scope: current_context

Phonetic notes:

* explicit despite `terminal` fragility

Expert shorthand:

* no

---

## 97. reset terminal preference here

Canonical:
`reset terminal preference here`

Aliases:

* forget terminal preference here
* clear terminal preference here

Legality:

* preference lane
* relevant stored preference must exist

Example parse:

* lane: preference
* verb: reset_preference
* object: terminal_preference
* scope: current_context

Phonetic notes:

* explicit and safe

Expert shorthand:

* no

---

## 98. what does terminal mean here

Canonical:
`what does terminal mean here`

Aliases:

* how are you interpreting terminal here
* terminal here means what

Legality:

* preference/inspection lane
* interpretable noun required

Example parse:

* lane: preference
* verb: inspect_preference
* object: terminal
* scope: current_context

Phonetic notes:

* good

Expert shorthand:

* no

---

## 99. why did you choose that

Canonical:
`why did you choose that`

Aliases:

* explain that choice
* why that interpretation

Legality:

* chooser/preference/inspection lane
* requires last decision context

Example parse:

* lane: repair/inspection
* verb: explain_choice
* object: last_decision

Phonetic notes:

* good

Expert shorthand:

* no

---

## 100. show my preferences here

Canonical:
`show my preferences here`

Aliases:

* inspect preferences here
* show preferences in this context

Legality:

* preference/inspection lane
* current context required

Example parse:

* lane: preference
* verb: inspect_preferences
* object: preference_set
* scope: current_context

Phonetic notes:

* robust

Expert shorthand:

* no

---

# Frozen Core Command Set Summary

## 20 reflex / mode / focus

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
11. enter command mode
12. enter dictation
13. leave dictation
14. enter coding mode
15. enter browser mode
16. enter terminal mode
17. enter secure mode
18. focus terminal
19. focus editor
20. return focus

## 30 operating / navigation

21. open terminal
22. close panel
23. show sidebar
24. hide sidebar
25. open settings
26. close dialog
27. next tab
28. previous tab
29. focus left pane
30. focus right pane
31. split right
32. split down
33. go line 42
34. scroll down
35. scroll up
36. scroll top
37. scroll bottom
38. select current line
39. select lines 10 through 20
40. copy selection
41. paste here
42. delete current line
43. move line down
44. move line up
45. open file
46. open file main.rs
47. close file
48. search files auth token
49. search page websocket
50. find auth

## 25 coding / browser / terminal

51. next error
52. previous error
53. open definition
54. open reference
55. rename symbol
56. rename symbol token map to token index
57. select function parse input
58. comment selection
59. uncomment selection
60. test file
61. test project
62. build project
63. run cargo build
64. run cargo test
65. run npm run dev
66. show logs
67. show logs in terminal
68. clear terminal
69. stop process
70. focus browser
71. open first result
72. click first result
73. next heading
74. focus search field
75. open browser tab 2

## 10 cognitive bridge

76. explain this error
77. explain function parse input
78. inspect selection
79. inspect session
80. inspect focus
81. compare these files
82. compare modules auth and api
83. summarize today’s changes
84. prepare my workspace
85. refactor this safely

## 15 chooser / preference / repair

86. one
87. two
88. three
89. confirm
90. no
91. repeat
92. correct that
93. correct terminal
94. use chooser next time
95. always use this here
96. prefer integrated terminal here
97. reset terminal preference here
98. what does terminal mean here
99. why did you choose that
100. show my preferences here

---

# What this gives the parser next

This is enough to start building the **parser skeleton**, **canonicalizer**, and **chooser loop**, because the command surface is now concrete.

The immediate implementation artifacts to freeze next are:

## 1. Verb registry

For each canonical verb:

* id
* class
* arity
* allowed postfixes
* allowed object classes
* lane defaults
* phonetic risk
* alias list

## 2. Object registry

For each canonical object:

* id
* object class
* focusable?
* selectable?
* executable?
* scope compatibility
* surface compatibility
* phonetic risk
* aliases

## 3. Alias registry

A one-way normalization map:

* spoken alias
* canonical verb/object
* allowed contexts
* ambiguity notes

## 4. Legality matrix

For each verb-object pair:

* C1 canonical legal
* C2 legal with qualification
* C3 alias collapse
* C4 cognitive only
* C5 illegal

## 5. Precedence table

Resolution order:

1. reflex
2. chooser overlay
3. mode
4. focus
5. canonical verb-first
6. scoped canonical
7. alias
8. cognitive
9. dictation fallback

## 6. Mode table

For each mode/state:

* boosted verbs
* boosted objects
* blocked commands
* confirmation changes
* overlay priority effects

## 7. Phonetic hazard table

For each critical term:

* hazard class
* common STT confusions
* auto-correct policy
* chooser threshold
* shorthand allowed?

## 8. Command inventory table

For these 100 commands:

* command_id
* canonical form
* family
* minimal slots
* allowed variants
* example parse
* implementation priority

---

# Build readiness assessment

With this command set frozen, you are now close enough to build:

* a tokenizer / normalizer
* alias collapse layer
* lane classifier
* legality checker
* chooser generator
* slot prompt engine
* parse-to-contract emitter

Not the whole VOS yet.
But absolutely the first **deterministic parser prototype**.

The next best move is to turn this into one or both of these:

# Maestro Verb Registry v0.1

and

# Maestro Object Registry v0.1

Those two artifacts would make the parser feel concrete immediately.
