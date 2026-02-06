# Docsee

## What is Docsee

Docsee is a CLI tool that downloads docs from upstream repos, generates compressed `AGENTS.md` index blocks, and keeps them up to date automatically.

Coding agents perform better when they use **retrieval-led reasoning** instead of relying on stale training data. Docsee downloads documentation from GitHub repos, generates a compressed index, and injects it into your `AGENTS.md` — so agents know where to find accurate, version-matched docs.

## Quick Start

```bash
npx docsee add https://github.com/vercel/ai/tree/main/content/docs --name ai-sdk
```

This single command creates `docsee.yaml`, downloads docs from the Vercel AI SDK repo, and generates an index block in your `AGENTS.md`:

```markdown
<!-- AI-SDK-Docs-START -->

[AI SDK Docs Index]|root: ./.docsee/ai-sdk
|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for AI SDK tasks.
|00-introduction:{index.mdx}
|02-foundations:{01-overview.mdx,02-providers-and-models.mdx,03-prompts.mdx,...}
|03-ai-sdk-core:{01-overview.mdx,05-generating-text.mdx,...}

<!-- AI-SDK-Docs-END -->
```

When your agent encounters an AI SDK task, it reads the index from context, then retrieves the specific doc file it needs from `.docsee/`.

## Commands

```
docsee init                  Create docsee.yaml config
docsee add <source>          Add a docs source
docsee sync [name]           Download docs + regenerate AGENTS.md index
docsee status [name]         Check if local docs are behind upstream
docsee diff [name]           Show what changed upstream since last sync
```

### `docsee add`

Accepts a GitHub URL — copy it straight from your browser. Creates `docsee.yaml` if it doesn't exist, adds the source, downloads docs, and generates the `AGENTS.md` index in one step:

```bash
docsee add https://github.com/vercel/ai/tree/main/content/docs --name ai-sdk
```

The URL contains the repo, branch, and docs path. The `--name` flag is optional (defaults to the repo name).

You can also use `owner/repo` shorthand, which will prompt for the docs path and branch interactively:

```bash
docsee add vercel/ai
```

| Flag         | Description                | Default   |
| ------------ | -------------------------- | --------- |
| `--name, -n` | Short name for this source | Repo name |

## Config

Docsee stores its config in `docsee.yaml`:

```yaml
agents_md: ./AGENTS.md

sources:
  - name: ai-sdk
    repo: vercel/ai
    path: content/docs
    branch: main
    local: ./.docsee/ai-sdk
    commit: abab9445485635ce7fdd5372e03f0002f536dcdc
```

The `commit` field is auto-managed. It tracks the last synced commit SHA so `status` and `diff` can compare against upstream.

## Keeping Docs Up to Date

Check if your local docs are behind:

```bash
docsee status
# ai-sdk: behind upstream (local: abab944 → remote: def456a)
```

See what changed:

```bash
docsee diff
# ai-sdk:
#   added:    content/docs/03-new-guide/index.mdx
#   modified: content/docs/00-introduction/index.mdx
```

Re-sync:

```bash
docsee sync
# ✓ ai-sdk: synced 234 files (def456a)
```

Add `docsee status` to a git hook or CI step to get notified when docs go stale.

## Team Usage

Commit `docsee.yaml` and `AGENTS.md` to your repo. The `.docsee/` directory is gitignored — only the config and index are shared, not the docs themselves.

When a teammate clones the project, they run one command:

```bash
docsee sync
```

This reads `docsee.yaml` and downloads all docs locally. The whole team stays on the same sources, same versions, same docs — without storing hundreds of files in git.

## Editing docsee.yaml Manually

If you remove a source from `docsee.yaml`, its downloaded docs in `.docsee/` and its index block in `AGENTS.md` are **not** automatically cleaned up. Delete them manually:

```bash
rm -rf .docsee/ai-sdk
```

Then remove the `<!-- AI-SDK-Docs-START -->` ... `<!-- AI-SDK-Docs-END -->` block from `AGENTS.md`.

The same applies when renaming a source — the old directory and old index block become orphaned.

## Agent Skill

Docsee ships with a skill that lets coding agents run docsee commands on your behalf. Install the skill from `docsee-skill/SKILL.md`, then tell your agent:

```
Use docsee to add the ai-sdk docs
```

```
Use docsee to sync docs
```

```
Use docsee to check if docs are up to date
```

You don't need to find the docs URL yourself — the agent will search for it, locate the docs directory in the repo, and run `npx docsee add` with the right URL.

## GitHub Rate Limits

Unauthenticated requests are limited to 60/hour. Set `GITHUB_TOKEN` for 5,000/hour:

```bash
export GITHUB_TOKEN=ghp_...
docsee sync
```

## What Gets Committed

| File           | Commit?                                          |
| -------------- | ------------------------------------------------ |
| `docsee.yaml`  | Yes — source of truth for your docs config       |
| `.docsee/`     | No — auto-added to `.gitignore` by `docsee sync` |
| `AGENTS.md`    | Yes — contains the index your agents read        |
