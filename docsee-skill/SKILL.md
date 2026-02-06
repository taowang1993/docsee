---
name: docsee
description: Manage AGENTS.md doc indexes synced from upstream GitHub repos. Use when the user wants to add, sync, check, or diff documentation sources.
---

# Docsee

Download docs from GitHub repos and inject compressed indexes into `AGENTS.md` for retrieval-led reasoning.

## Commands

### Add a source

```bash
npx docsee add https://github.com/OWNER/REPO/tree/BRANCH/DOCS_PATH --name SHORT_NAME
```

Creates `docsee.yaml`, downloads docs to `.docsee/`, and injects an index block into `AGENTS.md`. `--name` is optional (defaults to repo name).

If the user doesn't provide a URL, find it yourself:
1. Search the web for the library's GitHub repo
2. Browse the repo to locate the docs directory (common paths: `docs/`, `content/docs/`, `documentation/`)
3. Construct the URL as `https://github.com/OWNER/REPO/tree/BRANCH/DOCS_PATH`
4. Run `npx docsee add` with the discovered URL

### Sync docs

```bash
npx docsee sync [name]
```

Re-download docs and regenerate indexes. Run after cloning a repo with existing `docsee.yaml`, or to pull latest upstream.

### Check status

```bash
npx docsee status [name]
```

Show whether local docs are behind upstream.

### View diff

```bash
npx docsee diff [name]
```

Show files added/modified/removed upstream since last sync.

### Remove a source (manual)

1. Delete entry from `docsee.yaml`
2. `rm -rf .docsee/SOURCE_NAME`
3. Remove `<!-- NAME-Docs-START -->` ... `<!-- NAME-Docs-END -->` block from `AGENTS.md`
