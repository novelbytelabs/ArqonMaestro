# Building Arqon Maestro

Arqon Maestro uses Gradle for Java services and native build scripts for engine dependencies.

## Environment

Canonical paths and env vars:

- `ARQON_MAESTRO_SOURCE_ROOT`: source tree path
- `ARQON_MAESTRO_LIBRARY_ROOT`: dependency/model root (default `~/libarqon`)

Set these before building local services:

```bash
export ARQON_MAESTRO_SOURCE_ROOT=~/Projects/arqon/ArqonMaestro/maestro
export ARQON_MAESTRO_LIBRARY_ROOT=~/libarqon
```

## Build Dependencies

Install platform dependencies from the setup scripts:

```bash
scripts/setup/setup-ubuntu.sh
# or
scripts/setup/setup-mac.sh
```

Build native dependencies and models:

```bash
scripts/setup/build-dependencies.sh
```

Minimal runtime-only dependency build:

```bash
scripts/setup/build-dependencies.sh --minimal
```

## Compile Services

Build all services:

```bash
./gradlew installd
```

Build a specific service:

```bash
./gradlew speech-engine:installd
```

## Run Services

Run online services:

```bash
scripts/arqon_maestro/bin/run.py
```

Run selected services:

```bash
scripts/arqon_maestro/bin/run.py --service speech-engine --service code-engine
```

## Test

Run all tests:

```bash
scripts/arqon_maestro/bin/run.py --tests 'gradle test'
```

Run targeted tests:

```bash
scripts/arqon_maestro/bin/run.py --tests 'gradle core:test --tests *PythonTest.testAdd*'
```

## Local Client Integration

To build and install the local server bundle used by the client:

```bash
./gradlew installd
./gradlew client:installServer
```

Then run the client in local endpoint mode to use this bundle.

## Web Docs (Inherited Site Source)

For the inherited Gatsby web subtree:

```bash
cd web
npm install
npm run dev
```

Current canonical docs publishing is handled at the repository root via MkDocs.
