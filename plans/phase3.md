# Phase 3: Accept GitHub URLs as input

The `add` command should accept a full GitHub URL as the primary input, so developers can copy-paste directly from their browser.

## Goal

Replace this:

```bash
docsee add vercel/ai --path content/docs --name ai-sdk --branch main
```

With this:

```bash
docsee add https://github.com/vercel/ai/tree/main/content/docs
```

Both formats should still work. The `--name` flag remains as the only option (optional).

## URL Parsing

A GitHub docs URL follows this structure:

```
https://github.com/vercel/ai/tree/main/content/docs
                   ├────────┘      ├──┘ ├──────────┘
                   owner/repo    branch  path
```

### Create `src/utils/parse-source.ts` (new file)

Export a single function:

```ts
interface ParsedSource {
  repo: string;    // "vercel/ai"
  branch: string;  // "main"
  path: string;    // "content/docs"
}

function parseSource(input: string): ParsedSource | null
```

**Behavior:**

1. If `input` matches a GitHub URL pattern, parse it:
   - Pattern: `https://github.com/{owner}/{repo}/tree/{branch}/{path}`
   - Also accept with or without trailing slash
   - Also accept `http://` (normalize to https)
   - Also accept `github.com/...` without protocol
   - Strip `.git` suffix from repo name if present
   - Return `{ repo: "owner/repo", branch, path }`
2. If `input` matches `owner/repo` shorthand (the existing `^[\w.-]+/[\w.-]+$` pattern), return `null` — let the caller know this is the shorthand format and handle it separately.
3. Otherwise return `null`.

**Edge cases to handle:**

| Input | Result |
|---|---|
| `https://github.com/vercel/ai/tree/main/content/docs` | `{ repo: "vercel/ai", branch: "main", path: "content/docs" }` |
| `https://github.com/vercel/ai/tree/main/content/docs/` | Same (strip trailing slash) |
| `https://github.com/vercel/ai/tree/canary/docs` | `{ repo: "vercel/ai", branch: "canary", path: "docs" }` |
| `https://github.com/facebook/react/tree/main/docs` | `{ repo: "facebook/react", branch: "main", path: "docs" }` |
| `github.com/vercel/ai/tree/main/content/docs` | Same as with `https://` |
| `https://github.com/vercel/ai` | `null` — no tree/branch/path, not enough info |
| `vercel/ai` | `null` — shorthand format, handled separately |
| `random-string` | `null` — invalid |

**URL regex:**

```
^(?:https?://)?github\.com/([\w.-]+/[\w.-]+)/tree/([^/]+)/(.+?)/?$
```

Capture groups: 1 = `owner/repo`, 2 = `branch`, 3 = `path`.

## Changes to `src/commands/add.ts`

Rewrite `addCommand` to accept the raw input string (URL or shorthand) and an optional `--name` flag only.

**New signature:**

```ts
export async function addCommand(input: string, opts: { name?: string }): Promise<void>
```

**New logic:**

1. Call `parseSource(input)` from `src/utils/parse-source.ts`.
2. **If it returns a `ParsedSource`** (URL was parsed successfully):
   - Use `repo`, `branch`, `path` directly from the parsed result.
   - Derive `name` from `opts.name` if provided, otherwise from the repo name (e.g. `ai` from `vercel/ai`).
   - No prompts needed — all info is in the URL.
3. **If it returns `null` and input matches `owner/repo`** shorthand:
   - This is the legacy shorthand format.
   - Fetch the repo's default branch via `getRepoInfo`.
   - Prompt for path (default: `docs`), name (default: repo name), branch (default: repo default branch) — same as current interactive behavior.
   - The `--name` flag, if provided, skips the name prompt.
4. **If it returns `null` and input doesn't match `owner/repo`**:
   - Print: `"Invalid input. Use a GitHub URL or owner/repo format."`
   - Print: `"  Example: docsee add https://github.com/vercel/ai/tree/main/content/docs"`
   - Exit 1.
5. Rest of the function stays the same: validate repo exists, validate path exists in tree, check for duplicate names, append to config, print success message.

**Remove the `--path` and `--branch` flags entirely.** They're no longer needed since the URL provides both.

## Changes to `src/index.ts`

Update the `add` command registration:

```ts
program
  .command("add")
  .argument("<source>", "GitHub URL or owner/repo")
  .option("-n, --name <name>", "Short name for this source")
  .description("Add a docs source")
  .action((source: string, opts: { name?: string }) =>
    run(() => addCommand(source, opts))
  );
```

Remove `--path` and `--branch` options. Change argument description from "GitHub repo in owner/repo format" to "GitHub URL or owner/repo".

## Changes to `README.md`

Update the Quick Start section. Replace:

```bash
npx docsee add vercel/ai --path content/docs --name ai-sdk --branch main
```

With:

```bash
npx docsee add https://github.com/vercel/ai/tree/main/content/docs
```

Update the Commands section for `docsee add`:
- Primary usage: `docsee add <github-url>`
- With custom name: `docsee add <github-url> --name ai-sdk`
- Shorthand: `docsee add vercel/ai` (interactive prompts for path/branch)
- Remove the `--path` and `--branch` rows from the flags table. Only `--name` remains.

## Checklist

- [ ] Create `src/utils/parse-source.ts` with `parseSource()` function and the URL regex
- [ ] Rewrite `src/commands/add.ts`: new signature, use `parseSource`, remove `--path`/`--branch` handling, keep `--name` as optional flag
- [ ] Update `src/index.ts`: remove `--path`/`--branch` options from `add` command, update argument description
- [ ] Update `README.md`: Quick Start and Commands sections to show URL-based usage
- [ ] Run `npm run build` to verify
- [ ] Smoke test: `docsee add https://github.com/vercel/ai/tree/main/content/docs` then `docsee sync`
