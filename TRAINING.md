# Maestro Training & Fine-Tuning Guide

## Deep Dive: Can We Retrain? Can We Fine-Tune?

**Short Answer: YES to both.**

The entire training pipeline is included in the repository. You can retrain from scratch or fine-tune existing models.

---

## 🧠 Model Architecture Overview

### Speech Engine (Kaldi-based)

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Acoustic Model** | Kaldi TDNN | Audio → phoneme probabilities |
| **Language Model** | N-gram (SRILM) | Word sequence probability |
| **Decoding Graph** | Kaldi FST | Phonemes → words |
| **G2P** | Phonetisaurus | Unknown word pronunciation |
| **Re-ranker** | Transformer | Context-aware re-ranking |

### Code Engine (Marian-based)

| Model | Architecture | Purpose |
|-------|--------------|---------|
| **auto-style** | Transformer (8 enc, 8 dec) | Transcript → code |
| **contextual-language-model** | Transformer (6 enc, 6 dec) | Context scoring |
| **transcript-parser** | Transformer (6 enc, 1 dec) | Command parsing |

---

## 📊 Model Specifications

### Auto-Style Model (Code Generation)

```
Embedding dimension: 96
Feed-forward dimension: 512
Attention heads: 4
Encoder layers: 8
Decoder layers: 8
Dropout: 0.1
Max sequence length: 200
```

**VRAM Requirement**: ~2-4GB during training (fits your RTX 2060!)

### Speech Engine Models

- **Acoustic Model**: Pre-trained, can be fine-tuned
- **Language Model**: N-gram based, requires ~50GB source code corpus
- **G2P Model**: Phonetisaurus FST model

---

## 🔧 Training Pipeline

### Step 1: Setup Environment Variables

```bash
export ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/serenade
export ARQON_MAESTRO_LIBRARY_ROOT=~/libarqon
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"      # compatibility
export SERENADE_LIBRARY_ROOT="$ARQON_MAESTRO_LIBRARY_ROOT"    # compatibility
```

### Step 2: Install Dependencies

The full training setup requires:

```bash
# From the inherited engine subtree root
./scripts/setup/setup-ubuntu.sh  # or setup-mac.sh

# Build all dependencies (including training tools)
./scripts/setup/build-dependencies.sh
# NOTE: Do NOT use --minimal flag if you want to train!
```

This installs:
- **Kaldi** - Speech recognition toolkit
- **Marian NMT** - Neural machine translation (for transformers)
- **SRILM** - Language modeling
- **Phonetisaurus** - G2P conversion

---

## 🎯 Training the Code Engine

### Generate Training Data

```bash
# Generate dataset for auto-style model (Python)
$SERENADE_SOURCE_ROOT/scripts/serenade/code_engine/bin/generate_dataset.py \
  --model=auto-style \
  --language=python

# Output: Creates training pairs in ~/libarqon/code-engine-training/data/
```

**What this does**:
1. Downloads source code corpus from GitHub
2. Runs CorpusGen to create transcript → code pairs
3. Splits into train/test/validation sets

### Train the Model

```bash
# Train with your RTX 2060 (1 GPU, 6GB VRAM)
$SERENADE_SOURCE_ROOT/scripts/serenade/code_engine/bin/train.py \
  --model=auto-style \
  --language=python \
  --gpus=1

# Test mode (faster, for verification)
$SERENADE_SOURCE_ROOT/scripts/serenade/code_engine/bin/train.py \
  --model=auto-style \
  --language=python \
  --gpus=1 \
  --test-mode
```

**Training Parameters** (from train.py):
- Learning rate: 0.001
- Warmup: 4000 steps
- Batch size: 10000 words
- Early stopping: 10 epochs
- Label smoothing: 0.1 (contextual LM only)

### Export the Model

```bash
$SERENADE_SOURCE_ROOT/scripts/serenade/code_engine/bin/export.py
```

### Use Your New Model

1. Copy the tarball to `~/libarqon/models/code-engine/export/auto-style/python/`
2. Update `config/models.yaml` with the new hash
3. Rebuild Arqon Maestro

---

## 🎤 Training the Speech Engine

### Generate Dataset

```bash
# Downloads ~50GB of source code corpus
$SERENADE_SOURCE_ROOT/scripts/serenade/speech_engine/bin/train.py generate-dataset

# Test mode (smaller dataset)
$SERENADE_SOURCE_ROOT/scripts/serenade/speech_engine/bin/train.py generate-dataset --test-mode
```

**What this does**:
1. Downloads source code from all supported languages
2. Runs CorpusGen in `text` mode
3. Generates English transcripts from code
4. Adds filler words ("um", "uh")

### Train the Language Model

```bash
$SERENADE_SOURCE_ROOT/scripts/serenade/speech_engine/bin/train.py train-model

# Test mode
$SERENADE_SOURCE_ROOT/scripts/serenade/speech_engine/bin/train.py train-model --test-mode
```

**What this does**:
1. Creates pronunciation lexicon (ARPABET format)
2. Combines CMU dictionary + programming-specific words
3. Runs G2P on unknown words
4. Filters bad words and non-ASCII
5. Builds n-gram models (SRILM)
6. Creates Kaldi FST decoding graph

### Export

```bash
$SERENADE_SOURCE_ROOT/scripts/serenade/speech_engine/bin/export.py
```

---

## 🔄 Fine-Tuning Existing Models

### Fine-Tuning the Acoustic Model

The acoustic model can be fine-tuned with your own audio data:

```bash
# You need labeled audio data (10+ hours recommended)
# Format: audio files + corresponding transcripts

# Fine-tuning script is in Kaldi's standard tools
# Path: ~/libarqon/kaldi/egs/wsj/s5/steps/
```

**Note**: The original team found limited gains from acoustic model fine-tuning, but your results may vary with domain-specific data.

### Fine-Tuning the Code Engine

You can fine-tune on your own codebase:

```bash
# 1. Prepare your code corpus
# Put your code files in a directory structure

# 2. Generate training pairs from your code
$SERENADE_SOURCE_ROOT/scripts/serenade/code_engine/bin/generate_dataset.py \
  --model=auto-style \
  --language=python \
  --custom-corpus=/path/to/your/code

# 3. Continue training from existing model
# Edit train.py to add --pretrained-model flag
# Or manually copy existing model to model.npz before training
```

### Adding Custom Vocabulary

Add programming-specific words to the lexicon:

```bash
# Edit the custom lexicon file
# Location: config/lexicon.txt (or create one)

# Format: WORD  PHONEMES (ARPABET)
MYFUNCTION  M AY F AH NG K SH AH N
REFACTOR  R IY F AE K T ER
DEBOUNCE  D IY B AW N S
```

Then retrain the speech engine language model.

---

## 📏 Hardware Requirements

### Your RTX 2060 (6GB VRAM)

| Task | Feasible? | Estimated Time |
|------|-----------|----------------|
| Auto-style training (1 lang) | ✅ Yes | ~16 hours |
| Contextual LM training | ✅ Yes | ~8 hours |
| Transcript parser training | ✅ Yes | ~4 hours |
| Speech engine training | ✅ Yes (CPU) | ~2-4 hours |
| Data generation | ✅ Yes (CPU) | ~1-2 hours |

### Optimization Tips for Limited VRAM

1. **Reduce batch size**: Edit `--mini-batch-words` in train.py
2. **Use gradient accumulation**: Already implemented via `--optimizer-delay`
3. **Reduce model size**: Edit `--enc-depth` and `--dec-depth`
4. **Use mixed precision**: Add `--fp16` flag to Marian

```bash
# Example: Smaller model for 6GB VRAM
# Edit train.py to use:
--enc-depth 6    # instead of 8
--dec-depth 6    # instead of 8
--dim-emb 64     # instead of 96
--transformer-dim-ffn 256  # instead of 512
```

---

## 📁 Training Data Requirements

| Model | Training Data | Disk Space |
|-------|---------------|------------|
| Speech Engine | Source code corpus | ~50 GB |
| Auto-Style (per language) | Source/target pairs | ~10 GB |
| Contextual LM (per language) | Code snippets | ~5 GB |
| Transcript Parser | Command trees | ~1 GB |

### Data Sources

The original training used:
- GitHub public repositories
- StackOverflow code snippets
- Common code patterns

You can use your own codebase for domain-specific training!

---

## 🧪 Testing Your Models

### Unit Tests

```bash
# Test CorpusGen changes
./scripts/serenade/bin/run.py --tests 'gradle corpusgen:test'

# Test core functionality
./scripts/serenade/bin/run.py --tests 'gradle core:test'
```

### Manual Testing

```bash
# Start local services
./scripts/serenade/bin/run.py

# Run client with local endpoint
ENDPOINT=http://localhost:17200 ./client/bin/dev.py
```

### Metrics

The original team used:
- **Recall@1**: 0.913 (correct answer is top result)
- **Recall@5**: 0.971 (correct answer in top 5)
- **Recall@10**: 0.977 (correct answer in top 10)

---

## 🛠️ Advanced: Modifying the Architecture

### Adding a New Programming Language

1. Add language config to `config/languages.yaml`
2. Create tree-sitter grammar (or use existing)
3. Add language to CorpusGen
4. Generate training data
5. Train models

### Switching to Whisper

The docs mention they experimented with WeNet/wav2letter. You could:

1. Replace Kaldi with Whisper (whisper.cpp for local)
2. Keep the code engine unchanged
3. Just feed Whisper transcripts to the code engine

```python
# Conceptual integration
import whisper

model = whisper.load_model("base")
result = model.transcribe(audio)
transcript = result["text"]
# Send transcript to code engine...
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `scripts/serenade/code_engine/bin/train.py` | Code engine training |
| `scripts/serenade/code_engine/bin/generate_dataset.py` | Data generation |
| `scripts/serenade/speech_engine/bin/train.py` | Speech engine training |
| `config/models.yaml` | Model version hashes |
| `config/languages.yaml` | Language configurations |
| `docs/model-architecture.md` | Architecture details |
| `docs/generating-data.md` | CorpusGen documentation |

---

## ✅ Summary

| Question | Answer |
|----------|--------|
| Can we retrain from scratch? | ✅ Yes, full pipeline included |
| Can we fine-tune? | ✅ Yes, with custom data |
| Works with RTX 2060 6GB? | ✅ Yes, with optimizations |
| Can add new languages? | ✅ Yes, with tree-sitter grammar |
| Can use custom codebase? | ✅ Yes, via CorpusGen |
| Can replace speech engine? | ✅ Yes, Whisper integration possible |

The Arqon Maestro engine stack is **fully trainable and customizable**. All training scripts, data generation tools, and model architectures are included and documented.
