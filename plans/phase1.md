# Phase 1: Initial Plan

A CLI tool that downloads docs from upstream repos, generates compressed AGENTS.md index blocks, and keeps them up to date automatically.

## Value Proposition

Developers add framework docs to AGENTS.md so coding agents use retrieval-led reasoning instead of stale training data. But docs go stale. docsee watches upstream repos and keeps local docs + AGENTS.md index in sync, so developers don't have to.

## CLI Commands

```
docsee init                  # Create docsee.yaml config
docsee add vercel/ai         # Add a docs source interactively
docsee sync                  # Download docs + regenerate AGENTS.md index
docsee status                # Check if local docs are behind upstream
docsee diff                  # Show what changed upstream since last sync
```

## Config Format

```yaml
# docsee.yaml
agents_md: ./AGENTS.md

sources:
  - name: ai-sdk
    repo: vercel/ai
    path: content/docs          # Subdirectory in repo to download
    branch: main
    local: ./.docsee/ai-sdk     # Where to store locally
    commit: abc123f             # Last synced commit SHA (auto-managed)
```

## Index Output Format

Injected into AGENTS.md between markers:

```markdown
<!-- AI-SDK-Docs-START -->
[AI SDK Docs Index]|root: ./.docsee/ai-sdk
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for AI SDK tasks.
|00-introduction:{index.mdx}
|01-getting-started:{01-overview.mdx,02-installation.mdx}
|02-guides:{01-rag.mdx,02-multi-modal.mdx}
<!-- AI-SDK-Docs-END -->
```

### Index Generation Algorithm

1. Walk the local docs directory recursively
2. Group files by their parent directory path (relative to the docs root)
3. Sort directory groups alphabetically
4. Within each group, sort filenames alphabetically
5. Only include files with these extensions: `.md`, `.mdx`, `.txt`, `.rst`
6. Represent each group as `relative/path:{file1,file2,file3}` — no extension grouping, keep full filenames
7. Each group gets its own line prefixed with `|`
8. Directories with a single file still use the brace syntax: `path:{file.mdx}`
9. Empty directories are skipped

### Marker Name Derivation

The marker name is derived from the source `name` field in config, uppercased and hyphenated:
- `ai-sdk` → `<!-- AI-SDK-Docs-START -->` / `<!-- AI-SDK-Docs-END -->`
- `react` → `<!-- REACT-Docs-START -->` / `<!-- REACT-Docs-END -->`
- `my lib` → `<!-- MY-LIB-Docs-START -->` / `<!-- MY-LIB-Docs-END -->`

Rule: replace spaces and underscores with hyphens, uppercase everything, append `-Docs-START` / `-Docs-END`.

## Architecture

```
docsee/
├── src/
│   ├── index.ts              # CLI entry point (commander setup, register all commands)
│   ├── commands/
│   │   ├── init.ts           # Create docsee.yaml
│   │   ├── add.ts            # Add a docs source
│   │   ├── sync.ts           # Download + generate index
│   │   ├── status.ts         # Check upstream for changes
│   │   └── diff.ts           # Show upstream diff
│   ├── core/
│   │   ├── config.ts         # Read/write docsee.yaml
│   │   ├── download.ts       # Fetch docs from GitHub
│   │   ├── index-gen.ts      # Walk tree, produce compressed index
│   │   ├── inject.ts         # Patch AGENTS.md between markers
│   │   └── upstream.ts       # Check upstream commit SHA
│   └── utils/
│       └── github.ts         # GitHub API helpers
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── plan.md
```

## Tech Stack

- **Language:** TypeScript (ES2022, NodeNext module resolution)
- **CLI framework:** commander
- **GitHub API:** octokit/rest
- **YAML:** yaml (npm package)
- **Build:** tsup (bundle to single CJS for fast startup)
- **Distribution:** npm (`npx docsee sync`)
- **No test framework** — manual testing against real repos for v1

## package.json

```json
{
  "name": "docsee",
  "version": "0.1.0",
  "description": "Keep AGENTS.md docs in sync with upstream repos",
  "type": "module",
  "bin": {
    "docsee": "./dist/index.cjs"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.cjs"
  },
  "files": ["dist"],
  "dependencies": {
    "commander": "^13",
    "octokit": "^4",
    "yaml": "^2"
  },
  "devDependencies": {
    "tsup": "^8",
    "typescript": "^5"
  }
}
```

## tsup.config.ts

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node20",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"]
}
```

## Command Specifications

### `docsee init`

Creates a `docsee.yaml` in the current directory with empty sources.

**Behavior:**
1. Check if `docsee.yaml` already exists. If yes, print `"docsee.yaml already exists"` and exit with code 0.
2. Write the default config:
   ```yaml
   agents_md: ./AGENTS.md
   sources: []
   ```
3. Print `"Created docsee.yaml"`

**Exit codes:** 0 on success, 1 on write failure.

### `docsee add <repo>`

Adds a docs source. `<repo>` is in `owner/repo` format.

**Behavior:**
1. If `docsee.yaml` doesn't exist, print `"Run 'docsee init' first"` and exit 1.
2. Parse `<repo>` — must match `^[\\w.-]+/[\\w.-]+$`. If invalid, print `"Invalid repo format. Use owner/repo"` and exit 1.
3. Fetch the repo's default branch and root tree via GitHub API to validate the repo exists. If not found, print `"Repository not found: <repo>"` and exit 1.
4. Prompt user for:
   - **Docs path** (default: `docs`): `"Path to docs directory in repo"`
   - **Name** (default: repo name, e.g. `ai` from `vercel/ai`): `"Short name for this source"`
   - **Branch** (default: repo's default branch): `"Branch to track"`
5. Validate the docs path exists in the repo tree. If not, print `"Path '<path>' not found in <repo>"` and exit 1.
6. Set `local` to `./.docsee/<name>`.
7. Check for duplicate names in existing sources. If duplicate, print `"Source '<name>' already exists"` and exit 1.
8. Append the source to `docsee.yaml` with `commit: null` (not yet synced).
9. Print `"Added <name> (from <repo>/<path>). Run 'docsee sync' to download."`

**Exit codes:** 0 on success, 1 on validation failure.

**Prompting:** Use Node.js built-in `readline` for prompts. No extra dependency needed.

### `docsee sync`

Downloads docs and regenerates AGENTS.md index for all sources (or a specific one).

**Usage:** `docsee sync [name]` — if `name` is provided, sync only that source. Otherwise sync all.

**Behavior per source:**
1. Fetch the latest commit SHA for the source's branch via `GET /repos/{owner}/{repo}/commits?sha={branch}&per_page=1`.
2. Fetch the recursive tree for the docs path via `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`.
3. Filter the tree to only include blobs (files) under the configured `path`.
4. Download each file from `https://raw.githubusercontent.com/{owner}/{repo}/{commit}/{filepath}`.
   - Download files concurrently, max 10 at a time.
   - Only download files with extensions: `.md`, `.mdx`, `.txt`, `.rst`. Skip everything else (images, etc.).
   - Create directories as needed under `local`.
5. Delete any local files that no longer exist in the upstream tree (clean removed files).
6. Generate the index string using the index generation algorithm.
7. Inject the index into AGENTS.md using marker-based injection.
8. Update `commit` in `docsee.yaml` to the new SHA.
9. Print summary:
   ```
   ✓ ai-sdk: synced 47 files (abc123f)
   ```

**If AGENTS.md doesn't exist:** Create it with just the injected index block.

**If markers already exist in AGENTS.md:** Replace content between them. If markers don't exist, append the index block at the end of the file.

**Exit codes:** 0 on success, 1 on any failure (print error message for the failed source, continue syncing others).

### `docsee status`

Checks if local docs are behind upstream.

**Usage:** `docsee status [name]` — check one or all sources.

**Behavior per source:**
1. Read the stored `commit` SHA from `docsee.yaml`. If `null`, print `"<name>: never synced"` and continue.
2. Fetch the latest commit SHA for the branch (same API as sync step 1).
3. Compare:
   - If same: print `"<name>: up to date (abc123f)"`
   - If different: print `"<name>: behind upstream (local: abc123f → remote: def456a)"`

**Exit codes:** 0 if all sources are up to date, 1 if any source is behind or never synced.

### `docsee diff`

Shows what files changed upstream since last sync.

**Usage:** `docsee diff [name]` — diff one or all sources.

**Behavior per source:**
1. Read the stored `commit` SHA. If `null`, print `"<name>: never synced, run 'docsee sync'"` and continue.
2. Fetch the comparison via `GET /repos/{owner}/{repo}/compare/{base}...{head}` where `base` is the stored SHA and `head` is the branch name.
3. Filter the returned files to only those under the configured `path`.
4. Print each changed file with its status:
   ```
   ai-sdk:
     added:    content/docs/03-new-guide/index.mdx
     modified: content/docs/00-introduction/index.mdx
     removed:  content/docs/01-getting-started/old-page.mdx
   ```
5. If no files changed, print `"<name>: no changes"`

**Exit codes:** 0 on success, 1 on API failure.

## Error Handling

- **No `docsee.yaml`**: All commands except `init` print `"No docsee.yaml found. Run 'docsee init' first."` and exit 1.
- **GitHub API rate limit (403)**: Print `"GitHub API rate limit exceeded. Set GITHUB_TOKEN env var for higher limits."` and exit 1.
- **Network failure**: Print `"Network error: <message>"` and exit 1.
- **Invalid YAML**: Print `"Failed to parse docsee.yaml: <message>"` and exit 1.
- **Source name not found**: Print `"Source '<name>' not found in docsee.yaml"` and exit 1.

## GitHub Authentication

- Check for `GITHUB_TOKEN` env var. If set, pass it to Octokit as `auth`.
- If not set, use unauthenticated requests (60 requests/hour limit).
- Do not prompt for tokens. Just document it in `--help` output.

## .gitignore Guidance

`docsee sync` should create/append to `.gitignore` in the project root:

```
# docsee - downloaded docs
.docsee/
```

Only append if `.docsee/` is not already in `.gitignore`. Do not modify if already present. Create `.gitignore` if it doesn't exist. The `docsee.yaml` config itself should be committed (it's the source of truth).

## Implementation Steps

- [ ] **Scaffold project**: Create `package.json`, `tsconfig.json`, `tsup.config.ts` using the exact specs above. Run `npm install`.
- [ ] **CLI entry point**: Create `src/index.ts` with commander setup, register all 5 commands with their descriptions and optional `[name]` arguments.
- [ ] **Config module**: Create `src/core/config.ts` — `readConfig()` reads and parses `docsee.yaml`, `writeConfig()` writes it back. Type the config shape as a TypeScript interface.
- [ ] **GitHub utils**: Create `src/utils/github.ts` — initialize Octokit (with optional `GITHUB_TOKEN`), export helpers: `getLatestCommit(repo, branch)`, `getTree(repo, sha, path)`, `downloadFile(repo, commit, filepath)`, `compareCommits(repo, base, head)`. Handle rate limit errors.
- [ ] **`docsee init` command**: Create `src/commands/init.ts` following the init spec above.
- [ ] **`docsee add` command**: Create `src/commands/add.ts` following the add spec above. Use `readline` for prompts.
- [ ] **Download engine**: Create `src/core/download.ts` — given a source config, fetch tree, download files concurrently (max 10), clean removed files, return file count.
- [ ] **Index generator**: Create `src/core/index-gen.ts` — given a local docs directory, walk it, group files by parent directory, produce the pipe-delimited index string following the index generation algorithm.
- [ ] **AGENTS.md injector**: Create `src/core/inject.ts` — given a source name and index string, find/create markers in AGENTS.md, replace/append the index block. Handle .gitignore update.
- [ ] **`docsee sync` command**: Create `src/commands/sync.ts` — orchestrate download → index-gen → inject → update config. Wire up the `[name]` optional argument.
- [ ] **`docsee status` command**: Create `src/commands/status.ts` following the status spec above.
- [ ] **`docsee diff` command**: Create `src/commands/diff.ts` following the diff spec above.
- [ ] **Build and manual test**: Run `npm run build`, test with `node dist/index.cjs init`, `add vercel/ai`, `sync`, `status`, `diff` against a real repo.
