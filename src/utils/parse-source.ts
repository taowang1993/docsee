export interface ParsedSource {
  repo: string;
  branch: string;
  path: string;
}

const URL_PATTERN = /^(?:https?:\/\/)?github\.com\/([\w.-]+\/[\w.-]+)\/tree\/([^/]+)\/(.+?)\/?$/;

export function parseSource(input: string): ParsedSource | null {
  const trimmed = input.trim();
  const match = trimmed.match(URL_PATTERN);
  if (!match) return null;

  const repoRef = match[1];
  const branch = match[2];
  const rawPath = match[3];

  const [owner, repoNameRaw] = repoRef.split("/");
  if (!owner || !repoNameRaw) return null;
  const repoName = repoNameRaw.replace(/\.git$/, "");
  const repo = `${owner}/${repoName}`;
  const path = rawPath.replace(/\/+$/, "");
  if (!path) return null;

  return { repo, branch, path };
}
