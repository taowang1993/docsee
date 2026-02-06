# Phase 2: Post-review fixes

Follow-up changes from code review. Apply these to the existing codebase.

## 1. Replace `octokit` with raw `fetch`

Drop the `octokit` dependency entirely. The CLI only calls 4 GET endpoints. Replace with a thin wrapper.

### Create `src/utils/github-fetch.ts` (new file, replaces `src/utils/github.ts`)

Export a single helper:

```ts
async function githubFetch<T>(path: string): Promise<T>
```

**Behavior:**
- Base URL: `https://api.github.com`
- Set headers: `Accept: application/vnd.github+json`, `User-Agent: docsee`
- If `GITHUB_TOKEN` env var is set, add `Authorization: Bearer ${token}`
- If response status is 403 and body contains "rate limit", throw `GitHubRateLimitError`
- If response status is 404, throw an error with `status: 404` property so callers can check
- If response is not ok, throw with status and status text
- On network errors (`TypeError` from `fetch`), throw `GitHubNetworkError`
- Parse and return JSON

Export the same public functions with the same signatures, reimplemented with `githubFetch`:

- `getRepoInfo(repo)` → `GET /repos/{owner}/{repo}` → return `{ defaultBranch: string }`
- `getLatestCommit(repo, branch)` → `GET /repos/{owner}/{repo}/commits?sha={branch}&per_page=1` → return SHA string
- `getTree(repo, sha)` → `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` → return `TreeEntry[]`
- `downloadFile(repo, commit, filepath)` → `GET https://raw.githubusercontent.com/{owner}/{repo}/{commit}/{filepath}` — use the same `Authorization: Bearer` header if `GITHUB_TOKEN` is set (fixes private repo bug)
- `compareCommits(repo, base, head)` → `GET /repos/{owner}/{repo}/compare/{base}...{head}` → return `{ files: Array<{ filename, status }> }`

Keep the same error classes: `GitHubRateLimitError`, `GitHubNetworkError`. Keep `parseRepo`. Keep `RepoRef` and `TreeEntry` interfaces.

### Update `package.json`

- Remove `"octokit": "^4"` from dependencies
- No replacement needed

## 2. Delete `src/core/upstream.ts`

This file is a one-line passthrough:

```ts
export async function getUpstreamCommit(repo, branch) {
  return getLatestCommit(repo, branch);
}
```

Delete it. Update all imports to use `getLatestCommit` from `../utils/github` directly:

- `src/commands/add.ts`: change `import { getUpstreamCommit } from "../core/upstream"` → `import { getLatestCommit } from "../utils/github"`, rename all calls
- `src/commands/sync.ts`: same change
- `src/commands/status.ts`: same change

## 3. Remove duplicated error formatting

`formatSourceError` (sync.ts), `formatStatusError` (status.ts), and `formatDiffError` (diff.ts) are identical. They're also redundant with `handleCommonErrors` in `cli.ts`.

### Add `formatError` to `src/utils/cli.ts`

```ts
export function formatError(error: unknown): string {
  if (error instanceof GitHubRateLimitError) return error.message;
  if (error instanceof GitHubNetworkError) return `Network error: ${error.message}`;
  if (error instanceof ConfigParseError) return `Failed to parse docsee.yaml: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
```

### Update callers

- `src/commands/sync.ts`: delete `formatSourceError`, import `formatError` from `../utils/cli`, replace usage
- `src/commands/status.ts`: delete `formatStatusError`, import `formatError` from `../utils/cli`, replace usage
- `src/commands/diff.ts`: delete `formatDiffError`, import `formatError` from `../utils/cli`, replace usage

Also remove the now-unused direct imports of `GitHubNetworkError`, `GitHubRateLimitError`, `ConfigParseError` from these three command files (they're only needed in `cli.ts` now).

## 4. Fix `→` in status output

In `src/commands/status.ts`, change:

```ts
`${source.name}: behind upstream (local: ${source.commit.slice(0, 7)} -> remote: ${latestCommit.slice(0, 7)})`
```

to:

```ts
`${source.name}: behind upstream (local: ${source.commit.slice(0, 7)} → remote: ${latestCommit.slice(0, 7)})`
```

## 5. Rename github file

After all changes are applied, delete `src/utils/github.ts` and rename `src/utils/github-fetch.ts` to `src/utils/github.ts`. All existing imports (`from "../utils/github"`) stay the same.

## Checklist

- [ ] Create `src/utils/github-fetch.ts` with `githubFetch` helper and all exported functions reimplemented with raw `fetch`
- [ ] Remove `octokit` from `package.json` dependencies
- [ ] Delete `src/core/upstream.ts`
- [ ] Update `src/commands/add.ts`: import `getLatestCommit` from `../utils/github` instead of `getUpstreamCommit` from `../core/upstream`
- [ ] Update `src/commands/sync.ts`: same import change, delete `formatSourceError`, use `formatError` from `../utils/cli`
- [ ] Update `src/commands/status.ts`: same import change, delete `formatStatusError`, use `formatError` from `../utils/cli`, fix `->` to `→`
- [ ] Update `src/commands/diff.ts`: delete `formatDiffError`, use `formatError` from `../utils/cli`
- [ ] Add `formatError` to `src/utils/cli.ts`
- [ ] Delete `src/utils/github.ts`, rename `src/utils/github-fetch.ts` → `src/utils/github.ts`
- [ ] Run `npm install && npm run build` to verify
