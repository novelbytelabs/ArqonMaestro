# ArqonMaestro Architecture

**Voice-Native Layer for ArqonPilot**

---

## Serenade Protocol Analysis

### Core Message Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Core     │────▶│   Speech    │
│  (Electron) │     │   (Java)    │     │   Engine    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │   WebSocket       │                   │
       │   (Protobuf)      │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Plugin    │     │    Code     │     │   Kaldi     │
│  (VS Code)  │     │   Engine    │     │   Models    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Key Protocol Messages (from core.proto)

| Message | Purpose |
|---------|---------|
| `EvaluateAudioRequest` | Stream audio chunks to core |
| `EndpointRequest` | Signal end of speech, get transcript |
| `EditorState` | Current file, cursor, selection, language |
| `CommandsResponse` | List of commands to execute |
| `CustomCommand` | User-defined voice commands |

### EditorState Fields

```protobuf
message EditorState {
    bytes source = 1;              // Current file content
    int32 cursor = 2;              // Cursor position
    string filename = 3;           // Current file name
    string application = 5;        // "vscode", "intellij", etc.
    repeated CustomCommand custom_commands = 6;
    repeated string files = 7;     // Open files
    repeated string tabs = 10;     // Open tabs
    Language language = 17;        // Programming language
    bool dictate_mode = 18;        // Dictation vs command mode
    Range selection_range = 20;    // Selected text
    string url = 21;               // Current URL (for browser)
}
```

### Command Types (from core.proto)

```protobuf
enum CommandType {
    COMMAND_TYPE_NONE = 0;
    COMMAND_TYPE_INSERT = 38;      // Insert text
    COMMAND_TYPE_SELECT = 37;      // Select text
    COMMAND_TYPE_COPY = 5;
    COMMAND_TYPE_PASTE = 10;
    COMMAND_TYPE_UNDO = 17;
    COMMAND_TYPE_REDO = 12;
    COMMAND_TYPE_SAVE = 13;
    COMMAND_TYPE_OPEN_FILE = 9;
    COMMAND_TYPE_SEARCH = 14;
    COMMAND_TYPE_CUSTOM = 32;      // Custom commands
    COMMAND_TYPE_START_DICTATE = 62;
    COMMAND_TYPE_STOP_DICTATE = 63;
    // ... many more
}
```

---

## ArqonMaestro Integration Architecture

### Layer Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         ArqonMaestro Layer                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Audio Capture  │  │  Speech Engine  │  │  Command Parser │     │
│  │   (Rust/FFI)    │  │  (Kaldi/Marian) │  │    (ANTLR)      │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Context Resolver (Rust)                   │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │   │
│  │  │ Git State │ │ File State│ │ App State │ │ Bus State │   │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Command Router (Rust)                     │   │
│  │  Maps voice commands → ArqonPilot CLI operations            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                        ArqonPilot Core                              │
├────────────────────────────────────────────────────────────────────┤
│  pilot branch  │ pilot heal  │ pilot oracle │ pilot govern        │
│  pilot multi   │ pilot create│ pilot navigate│ pilot secure       │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Audio Capture (Rust)

```rust
// crates/maestro-audio/src/lib.rs

/// Audio capture with VAD (Voice Activity Detection)
pub struct AudioCapture {
    sample_rate: u32,
    vad: VoiceActivityDetector,
}

impl AudioCapture {
    /// Start capturing audio from microphone
    pub fn start(&mut self) -> Result<(), MaestroError>;
    
    /// Get next audio chunk (blocking)
    pub fn get_chunk(&mut self) -> Option<AudioChunk>;
    
    /// Check if speech is detected
    pub fn is_speech(&self) -> bool;
}
```

### 2. Speech Engine Bridge (Rust FFI)

```rust
// crates/maestro-speech/src/lib.rs

/// Bridge to Kaldi speech engine
pub struct SpeechEngine {
    models_path: PathBuf,
    acoustic_model: AcousticModel,
    decoder: KaldiDecoder,
}

impl SpeechEngine {
    /// Initialize with model path
    pub fn new(models_path: &Path) -> Result<Self, MaestroError>;
    
    /// Decode audio to transcript
    pub fn decode(&mut self, audio: &[f32]) -> Result<Vec<Transcript>, MaestroError>;
    
    /// Get alternatives (top N)
    pub fn get_alternatives(&self, n: usize) -> Vec<Transcript>;
}

pub struct Transcript {
    pub text: String,
    pub confidence: f32,
}
```

### 3. Command Parser (Rust)

```rust
// crates/maestro-parser/src/lib.rs

/// Parse transcripts into commands
pub struct CommandParser {
    grammar: ArqonGrammar,
}

impl CommandParser {
    /// Parse transcript to command tree
    pub fn parse(&self, transcript: &str) -> Result<CommandTree, ParseError>;
}

pub enum ArqonCommand {
    // Branch commands
    BranchCreate { name: String },
    BranchSwitch { name: String },
    BranchMerge { name: String },
    BranchCheck,
    
    // Heal commands
    HealFile { path: String },
    HealSelection,
    HealThis,
    
    // Oracle commands
    OracleQuery { query: String },
    OracleIndex,
    
    // Governance commands
    GovernCheck,
    GovernApprove,
    GovernReject,
    
    // Navigation commands
    NavigateStatus,
    NavigatePush,
    NavigatePull,
    
    // System commands
    ShowStatus,
    RunTests,
    Build,
}
```

### 4. Context Resolver (Rust)

```rust
// crates/maestro-context/src/lib.rs

/// Resolves context from ArqonPilot state
pub struct ContextResolver {
    bus_client: BusClient,
}

impl ContextResolver {
    /// Get current context
    pub fn resolve(&self) -> ArqonContext {
        ArqonContext {
            current_branch: self.get_current_branch(),
            current_file: self.get_current_file(),
            selection: self.get_selection(),
            open_files: self.get_open_files(),
            git_status: self.get_git_status(),
            governance_state: self.get_governance_state(),
        }
    }
}

pub struct ArqonContext {
    pub current_branch: Option<String>,
    pub current_file: Option<String>,
    pub selection: Option<String>,
    pub open_files: Vec<String>,
    pub git_status: GitStatus,
    pub governance_state: GovernanceState,
}
```

### 5. Command Router (Rust)

```rust
// crates/maestro-router/src/lib.rs

/// Routes parsed commands to ArqonPilot
pub struct CommandRouter {
    pilot_cli: PilotCli,
}

impl CommandRouter {
    /// Execute a voice command
    pub async fn execute(&self, command: ArqonCommand, context: &ArqonContext) -> Result<CommandResult, RouterError>;
}

pub enum CommandResult {
    Success { message: String },
    Error { message: String },
    RequiresConfirmation { prompt: String },
    MultipleOptions { options: Vec<String> },
}
```

---

## Voice Command Grammar (Draft)

### ANTLR Grammar for Arqon Commands

```antlr
grammar ArqonCommands;

command
    : branchCommand
    | healCommand
    | oracleCommand
    | governCommand
    | navigateCommand
    | systemCommand
    ;

// Branch commands
branchCommand
    : 'create' 'branch' name=identifier
    | 'switch' 'to' 'branch' name=identifier
    | 'merge' 'branch' name=identifier
    | 'delete' 'branch' name=identifier
    | 'check' 'branch'
    | 'branch' 'status'
    ;

// Heal commands
healCommand
    : 'heal' 'file' path=filePath
    | 'heal' 'this' 'file'
    | 'heal' 'selection'
    | 'heal' 'line'
    | 'fix' 'this'
    ;

// Oracle commands
oracleCommand
    : 'query' 'oracle' 'for' query=text
    | 'ask' 'oracle' query=text
    | 'what' 'does' 'oracle' 'know' 'about' query=text
    | 'index' 'for' 'oracle'
    | 'rebuild' 'oracle'
    ;

// Governance commands
governCommand
    : 'run' 'governance' 'check'
    | 'check' 'governance'
    | 'approve' 'change'
    | 'reject' 'change'
    | 'show' 'policy' 'status'
    ;

// Navigation commands
navigateCommand
    : 'show' 'status'
    | 'push' 'changes'
    | 'pull' 'changes'
    | 'commit' message=text
    | 'show' 'diff'
    ;

// System commands
systemCommand
    : 'run' 'tests'
    | 'build' 'project'
    | 'start' 'server'
    | 'stop' 'server'
    | 'show' 'logs'
    ;

identifier
    : IDENTIFIER
    | STRING
    ;

filePath
    : identifier ('/' identifier)*
    ;

text
    : identifier+
    ;

IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_-]*
    ;

STRING
    : '"' ~'"'* '"'
    ;
```

---

## Integration with ArqonPilot Bus

### Bus Protocol Extension

```rust
// Extend existing bus protocol for voice events

pub enum BusEvent {
    // Existing events...
    
    // New voice events
    VoiceCommandReceived { transcript: String, confidence: f32 },
    VoiceCommandExecuted { command: String, result: CommandResult },
    VoiceModeChanged { mode: VoiceMode },
    VoiceError { error: String },
}

pub enum VoiceMode {
    Command,    // Voice commands active
    Dictation,  // Dictation mode active
    Disabled,   // Voice disabled
}
```

### WebSocket Endpoint

```rust
// Add voice endpoint to pilot serve

// In crates/pilot/src/serve_ui.rs

async fn voice_ws_handler(
    ws: WebSocket,
    state: Arc<PilotState>,
) -> Result<()> {
    let mut maestro = MaestroEngine::new(&state.config)?;
    
    while let Some(msg) = ws.next().await {
        match msg? {
            Message::Binary(audio) => {
                let transcripts = maestro.process_audio(&audio)?;
                let commands = maestro.parse_commands(&transcripts)?;
                let results = maestro.execute_commands(commands).await?;
                ws.send(Message::Binary(serialize(&results)?)).await?;
            }
            Message::Text(cmd) => {
                // Handle text commands (for testing)
            }
            _ => {}
        }
    }
    Ok(())
}
```

---

## Model Adaptation for Arqon

### Custom Vocabulary

```
# Arqon-specific vocabulary for speech engine
# Format: WORD  PHONEMES (ARPABET)

ARQON  AA R K AA N
PILOT  P AY L AH T
ORACLE  AO R AH K AH L
MAESTRO  M AY S T R OW
GOVERNANCE  G AH V ER N AH N S
PREFLIGHT  P R IY F L AY T
PROVENANCE  P R AA V AH N AH N S
FEDERATED  F EH D ER EY T AH D
```

### Command Training Data

Generate training pairs from ArqonPilot commands:

```python
# Example training pairs for auto-style model
# Source (transcript) -> Target (command)

"create branch feature auth" -> "pilot branch create feature-auth"
"heal this file" -> "pilot heal --file ${current_file}"
"query oracle for authentication" -> "pilot oracle query 'authentication'"
"run governance check" -> "pilot govern check"
"show status" -> "pilot navigate status"
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-2)

- [ ] Create `crates/maestro-audio` - Audio capture with VAD
- [ ] Create `crates/maestro-speech` - Kaldi FFI bindings
- [ ] Create `crates/maestro-parser` - Command parser
- [ ] Create `crates/maestro-context` - Context resolver
- [ ] Create `crates/maestro-router` - Command router

### Phase 2: Integration (Weeks 3-4)

- [ ] Add voice WebSocket endpoint to `pilot serve`
- [ ] Integrate with ArqonPilot bus
- [ ] Add voice mode to UI
- [ ] Create basic command set

### Phase 3: Polish (Weeks 5-6)

- [ ] Train Arqon-specific vocabulary
- [ ] Add dictation mode
- [ ] Add audio feedback (TTS)
- [ ] Optimize latency

### Phase 4: Advanced (Weeks 7-8)

- [ ] Add custom command support
- [ ] Add voice macros
- [ ] Create training pipeline
- [ ] Documentation

---

## File Structure

```
ArqonMaestro/
├── README.md              # Project overview
├── VISION.md              # Vision and opportunity
├── TRAINING.md            # Model training guide
├── ARCHITECTURE.md        # This file
├── download_models.sh     # Model download script
├── serenade/              # Original Serenade codebase
├── vscode-plugin/         # VS Code extension
└── arqon-grammar/         # ANTLR grammar for Arqon commands
    └── ArqonCommands.g4

ArqonPilot/crates/
├── maestro-audio/         # Audio capture
├── maestro-speech/        # Speech engine bridge
├── maestro-parser/        # Command parser
├── maestro-context/       # Context resolver
├── maestro-router/        # Command router
└── pilot/                 # Existing pilot crate (extended)
```

---

## Next Steps

1. **Create Rust crates** for each component
2. **Build FFI bindings** for Kaldi/Marian
3. **Define ANTLR grammar** for Arqon commands
4. **Implement context resolver** using existing bus
5. **Create MVP** with 5-10 core commands
