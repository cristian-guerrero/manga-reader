---
name: git-commit
description: "Generate conventional commit messages and create commits. Before committing, automatically reviews and updates README.md (features, supported sites, version) and AGENTS.md (architecture, modules, commands, conventions) to reflect recent changes. Use when the user asks for a commit message or to make a commit."
---

# Git Commit Workflow

When the user asks for a commit message or to make a commit (e.g., "give me el mensaje para el commit", "haz el commit", "commit this", "generate commit message"), follow this workflow.

## 1. Understand What Changed

```bash
cd /project/apps/manga-reader
git diff --stat                 # Overview of changed files
git diff                        # Full diff of staged+unstaged changes
git diff --cached               # Only staged changes
```

For untracked files:
```bash
git status --short              # See untracked/new files
```

## 2. Update README.md (if necessary)

**Purpose**: Keep `README.md` in sync with actual project state. Only update sections that are **inaccurate** due to the current changes.

Check these sections and update if the changes affect them:

| Section | When to update |
|---------|---------------|
| **Badge version** (`version-1.0.5`) | If version changed |
| **Supported Sites** list | When adding/removing a downloader site. Append new sites alphabetically. |
| **Features** list | When adding/removing a major feature (colorizer, downloader, viewer modes, etc.) |
| **Keyboard Shortcuts** table | When adding/removing shortcuts |
| **Tech Stack** | When adding/removing a dependency |
| **Data Storage** (folders/config files) | When adding/removing a config file or changing paths |
| **CI / Build Notes** | When changing build process or CI config |
| **Prerequisites** | When changing Go/Node/Wails versions |
| **License / Credits** | When adding third-party code with different licenses |

**Rules**:
- Do NOT update README.md if the changes don't affect any of the above.
- Keep descriptions concise and match the existing tone (English, premium aesthetic).
- Update version badge only when a new release tag exists.
- Add new supported sites to the bullet list maintaining alphabetical order.
- If the count changed (e.g., "22 sites" → "23 sites"), update the header count.

## 3. Update AGENTS.md (if necessary)

**Purpose**: Keep `AGENTS.md` accurate for future agent sessions.

Check these sections and update if the changes affect them:

| Section | When to update |
|---------|---------------|
| **Developer Commands** (`go test`, `npm run lint`, etc.) | When adding/removing npm scripts, Makefile targets, or test commands |
| **Architecture / Go backend** modules | When adding/removing a module in `internal/modules/`, a service in `internal/services/`, or a persistence store in `internal/persistence/` |
| **Architecture / Frontend** | When adding/removing a major frontend directory or changing Vite config aliases |
| **Architecture / Colorizer** | When changing the colorizer backend or its management |
| **Data Storage** | When adding/removing JSON stores or cache/downloads/temp directories |
| **Conventions** | When changing commit conventions, output binary name, or frontend style |
| **Downloader Module** | When adding/removing a supported site, changing concurrency logic, or clipboard detection |
| **Build Notes** | When changing build scripts, platform targets, or CI config |

**Rules**:
- Do NOT update AGENTS.md if the changes don't affect any of the above.
- Keep descriptions accurate for future agent sessions.
- Section references should use file paths relative to project root (e.g., `internal/modules/downloader/module.go:53-70`).
- If adding a new module, briefly describe its responsibility.

## 4. Stage Everything

```bash
cd /project/apps/manga-reader
git add -A
```

## 5. Generate Commit Message

Follow the project conventions from `AGENTS.md` and `.cursorrules`:

- **Format**: `type: description`
- **Language**: English only, no Spanish characters (á, é, í, ó, ú, ñ, etc.)
- **Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`, `ci`, `build`
- **Scope** (optional but encouraged): `feat(downloader):`, `fix(explorer):`, `docs:`, `refactor(persistence):`
- **Description**: Concise, descriptive, imperative mood

Examples:
```
feat(downloader): add MangaToon downloader with series and chapter support
fix(explorer): skip folders with 0 images in viewer folder navigation
docs: update README and AGENTS.md for new downloader sites
refactor(persistence): extract common test utilities
```

## 6. Present to User

Show the user:
1. A summary of what changed (files + key changes)
2. What was updated in README.md and AGENTS.md (if anything)
3. The proposed commit command

Example output:
```
📝 Changes detected:
   - internal/downloader/mangatoon.go (new file)
   - internal/modules/downloader/module.go (registered new site)

📄 README.md updated: added MangaToon to supported sites list (now 23 sites)
📄 AGENTS.md updated: added MangaToon downloader reference

✅ Proposed commit:
git commit -m "feat(downloader): add MangaToon downloader support"
```

Then ask: *"¿Hago el commit?"* or *"Shall I commit?"*

If user confirms, run:
```bash
cd /project/apps/manga-reader && git commit -m "<generated message>"
```

If user declines or wants to modify, adjust accordingly.
