# Maestro

**Voice-powered coding for everyone.**

Maestro is a preservation and revival project for [ArqonMaestro](https://github.com/serenadeai/serenade), an open-source voice coding application designed for developers with disabilities, RSI, or anyone who wants to code using natural speech.

---

## 🎯 Project Goals

1. **Preserve** the ArqonMaestro codebase and AI models for posterity
2. **Maintain** a working, offline-capable voice coding system
3. **Improve** compatibility with modern IDEs and operating systems
4. **Document** the architecture for future developers

---

## 📦 What's Included

| Component | Location | Description |
|-----------|----------|-------------|
| **Core Engine** | `serenade/` | Java-based AST manipulation, command processing |
| **Client App** | `serenade/client/` | Electron desktop application |
| **VS Code Plugin** | `vscode-plugin/` | VS Code extension |
| **AI Models** | `~/libserenade/models/` | Speech & code generation models (1.1GB) |
| **Download Script** | `download_models.sh` | Re-download models from CDN |

---

## 🧠 AI Models Breakdown

### Model Sizes

| Model | Size | Purpose |
|-------|------|---------|
| **Speech Engine** | | |
| ├─ Acoustic Model | 122 MB | Converts audio → phonemes |
| ├─ Export (Graph) | 360 MB | Kaldi FST decoding graph |
| ├─ Export (Final.mdl) | 81 MB | Neural acoustic model |
| ├─ Export (Lang) | 96 MB | Language model data |
| ├─ G2P Model | 45 MB | Grapheme → phoneme conversion |
| └─ User Language Model | 136 KB | User-specific n-grams |
| **Code Engine** | | |
| ├─ Auto-Style (all languages) | 163 MB | Transcript → code generation |
| ├─ Contextual LM (all languages) | 162 MB | Code context awareness |
| └─ Transcript Parser | 4 KB | Parse voice commands |
| **Total** | **~1.1 GB** | |

### What Each Model Does

1. **Acoustic Model** (`final.mdl`) - Neural network that converts raw audio into phoneme probabilities. Based on Kaldi's TDNN architecture.

2. **Decoding Graph** (`graph/`) - Finite State Transducer (FST) that maps phonemes to words using:
   - Pronunciation dictionary (ARPABET format)
   - Language model (n-grams from code corpus)
   - Vocabulary (programming-specific words)

3. **G2P Model** (`model.fst`) - Converts unknown words to phonemes using Phonetisaurus, enabling recognition of new variable/function names.

4. **Auto-Style Models** - Transformer-based models (Marian NMT) that convert natural language transcripts into syntactically correct code:
   - Input: "add function called get name"
   - Output: `def get_name():\n    pass`

5. **Contextual Language Models** - Rerank code alternatives based on surrounding context in the file.

6. **Transcript Parser** - Parses the voice transcript into a command tree structure.

---

## 🔧 Retraining & Fine-Tuning Models

### Can I Retrain? **YES!**

All training code is included in the repository. You can:

- ✅ Retrain from scratch
- ✅ Fine-tune existing models
- ✅ Add new programming languages
- ✅ Customize vocabulary

### Hardware Requirements

| Task | Minimum GPU | Recommended | Time (per language) |
|------|-------------|-------------|---------------------|
| **Code Engine Training** | 1 GPU (6GB VRAM) | 4 GPUs | ~16 hours / ~4 hours |
| **Speech Engine Training** | CPU only | CPU | ~2-4 hours |
| **Data Generation** | CPU only | CPU | ~1-2 hours |

**Your RTX 2060 (6GB VRAM) is sufficient for training!** It will take longer than a multi-GPU setup, but it will work.

### Training the Code Engine

```bash
# 1. Generate training data (CPU, no GPU needed)
# This downloads ~50GB of source code data
scripts/serenade/code_engine/bin/generate_dataset.py \
  --model=auto-style \
  --language=python

# 2. Train the model (GPU recommended)
# With your RTX 2060:
scripts/serenade/code_engine/train.py \
  --model=auto-style \
  --language=python \
  --gpus=1

# 3. Export the model
scripts/serenade/code_engine/export.py
```

### Training the Speech Engine

```bash
# 1. Generate dataset (downloads source code corpus)
scripts/serenade/speech_engine/bin/train.py generate-dataset

# 2. Train the language model (CPU-based, uses Kaldi)
scripts/serenade/speech_engine/bin/train.py train-model

# 3. Export
scripts/serenade/speech_engine/bin/export.py
```

### Adding Custom Vocabulary

Edit the pronunciation lexicon to add new words:

```
# In config/lexicon.txt
SERENADE  S ER AH N EY D
REFACTOR  R IY F AE K T ER
```

### Fine-Tuning for Your Codebase

1. Collect your own code corpus
2. Run CorpusGen to generate training pairs
3. Fine-tune the auto-style model on your data

```bash
# Use your own code as training data
export SERENADE_SOURCE_ROOT=~/Projects/Maestro/serenade
export SERENADE_LIBRARY_ROOT=~/libserenade

# Generate training pairs from your code
scripts/serenade/code_engine/bin/generate_dataset.py \
  --model=auto-style \
  --language=python \
  --custom-corpus=/path/to/your/code
```

### Training Data Requirements

| Model | Training Data | Size |
|-------|---------------|------|
| Speech Engine | Source code corpus | ~50 GB |
| Auto-Style | Source/target pairs | ~10 GB per language |
| Contextual LM | Code snippets | ~5 GB per language |

---

## 🚀 Quick Start

### Prerequisites

- **Java 14+** (for core engine)
- **Node.js 16+** (for client)
- **Python 3** (for scripts)
- **Gradle** (build system)

### 1. Build the Core Engine

```bash
cd serenade
gradle installd
```

### 2. Build the Client

```bash
cd serenade/client
npm install
npm run build
```

### 3. Run Locally (with cloud backend)

```bash
cd serenade/client
./bin/dev.py
```

### 4. Run Fully Offline

```bash
# Start local services
./scripts/serenade/bin/run.py

# In another terminal, run client pointing to local endpoint
ENDPOINT=http://localhost:17200 ./client/bin/dev.py
```

---

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   Core Engine   │────▶│  Speech Engine  │
│   (Electron)    │     │     (Java)      │     │    (C++/Kaldi)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        └──────────────▶│  Code Engine    │◀────────────┘
                        │  (C++/Marian)   │
                        └─────────────────┘
```

### Request Flow

1. **Client** captures audio from microphone
2. **Speech Engine** converts speech → transcript
3. **Code Engine** converts transcript → code commands
4. **Core Engine** processes commands, manipulates AST
5. **Plugin** applies changes to the active editor

---

## 📁 Model Files

The AI models are stored in `~/libserenade/models/`:

```
~/libserenade/models/
├── speech-engine/
│   ├── acoustic-model/     # Kaldi acoustic model (~110MB)
│   ├── export/             # Speech recognition model (~279MB)
│   ├── g2p/                # Grapheme-to-phoneme
│   └── user-language-model/
└── code-engine/
    └── export/
        ├── transcript-parser/    # Parse voice commands
        ├── auto-style/           # Code generation (per language)
        │   ├── python/
        │   ├── javascript/
        │   ├── rust/
        │   └── ... (14 languages)
        └── contextual-language-model/
            └── ... (per language)
```

### Supported Languages

- Python
- JavaScript / TypeScript
- Java
- C++
- Go
- Rust
- Ruby
- HTML / CSS / SCSS
- Bash
- C#
- Dart
- Kotlin

---

## 🔧 Re-downloading Models

If you need to re-download the models:

```bash
./download_models.sh
```

Models are downloaded from `https://serenadecdn.com/models/` (still active as of March 2026).

---

## 📋 Known Issues (from Original ArqonMaestro)

| Issue | Status | Notes |
|-------|--------|-------|
| JetBrains 2024.3+ incompatibility | 🔴 Open | Plugin API changed |
| macOS Sonoma focus command | 🔴 Open | Accessibility API update needed |
| Linux AppImage blank window | 🔴 Open | Electron rebuild needed |
| "Did you know" popup loop | 🔴 Open | Bug in client |

---

## 🗺️ Roadmap

### Phase 1: Preservation ✅
- [x] Clone source repositories
- [x] Download all AI models
- [x] Document architecture

### Phase 2: Build Verification
- [ ] Verify build on Linux
- [ ] Verify build on macOS
- [ ] Verify build on Windows
- [ ] Test offline mode

### Phase 3: Bug Fixes
- [ ] Fix JetBrains plugin compatibility
- [ ] Fix macOS Sonoma issues
- [ ] Fix Linux AppImage

### Phase 4: Enhancements
- [ ] Update to modern Electron
- [ ] Update to Java 21
- [ ] Add Whisper as alternative speech engine
- [ ] Improve documentation

---

## 📜 License

- **Core Engine**: Apache 2.0
- **Client**: MIT
- **VS Code Plugin**: MIT

Original project by [ArqonMaestro Labs, Inc.](https://github.com/serenadeai)

---

## 🙏 Credits

- Original ArqonMaestro team for creating an accessibility-first coding tool
- The open-source community for keeping the project alive

---

## 📚 Resources

- [Original ArqonMaestro Repo](https://github.com/serenadeai/serenade)
- [ArqonMaestro Website](https://serenade.ai) (may be inactive)
- [Discord Community](https://serenade.ai/community)
- [Building Guide](serenade/docs/building.md)
- [Codebase Layout](serenade/docs/codebase-layout.md)
