# Prompt for the Other AI to Build `new_instance.zip`

You are assembling `new_instance.zip` to help a fresh PM/engineering assistant resume the H3 / Arqon Maestro project.

Your job:
collect the curated documentation/scripts pack from the real repository and package it as `new_instance.zip`.

Rules:
- docs and scripts first
- do not invent files
- do not silently substitute alternate files
- if a listed file is missing, report it as missing
- do not include broad source/runtime code unless it is explicitly in the list or clearly needed to resume
- keep it under the listed cap
- preserve paths inside the zip

Inputs:
- use `FILE_LIST_FOR_NEW_INSTANCE_ZIP.md` from the transition context pack as the authoritative target list
- real repo is the source of truth
- current project branch should be the H3 working branch unless otherwise instructed

Required output:
1. `new_instance.zip`
2. `new_instance_manifest.md` containing:
   - included files
   - missing files
   - sha256 for included files
   - repo branch
   - HEAD commit
3. `new_instance_apply_notes.md` containing:
   - anything important the next instance should know
   - any stage docs missing from repo
   - any branch inconsistencies found

Do not:
- rewrite the docs
- summarize instead of collecting
- include giant irrelevant folders
- include secrets or credentials
- include bulky binary junk unless explicitly listed

Preferred behavior:
- if a file exists at multiple plausible paths, prefer the exact listed path
- if a listed file is not found, do not guess unless there is an obvious exact replacement and you clearly mark it as substituted
