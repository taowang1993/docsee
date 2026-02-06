export interface RepoRef {
  owner: string;
  repo: string;
}

export interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
}

export class GitHubRateLimitError extends Error {
  code = "DOCSEE_GH_RATE_LIMIT";
  constructor() {
    super("GitHub API rate limit exceeded. Set GITHUB_TOKEN env var for higher limits.");
  }
}

export class GitHubNetworkError extends Error {
  code = "DOCSEE_NETWORK";
  constructor(message: string) {
    super(message);
  }
}

const API_BASE = "https://api.github.com";

function getAuthHeader(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function getApiHeaders(): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "docsee",
    ...getAuthHeader(),
  };
}

export function parseRepo(repo: string): RepoRef {
  const [owner, name] = repo.split("/");
  return { owner, repo: name };
}

export async function githubFetch<T>(path: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { headers: getApiHeaders() });
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 403 && text.toLowerCase().includes("rate limit")) {
        throw new GitHubRateLimitError();
      }
      if (response.status === 404) {
        const error = new Error("Not found") as Error & { status?: number };
        error.status = 404;
        throw error;
      }
      const error = new Error(`${response.status} ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new GitHubNetworkError(error.message);
    }
    throw error;
  }
}

export async function getRepoInfo(repo: string): Promise<{ defaultBranch: string }> {
  const { owner, repo: name } = parseRepo(repo);
  const result = await githubFetch<{ default_branch: string }>(`/repos/${owner}/${name}`);
  return { defaultBranch: result.default_branch };
}

export async function getLatestCommit(repo: string, branch: string): Promise<string> {
  const { owner, repo: name } = parseRepo(repo);
  const result = await githubFetch<Array<{ sha: string }>>(
    `/repos/${owner}/${name}/commits?sha=${encodeURIComponent(branch)}&per_page=1`
  );
  if (!result[0]) {
    throw new Error(`No commits found for ${repo} on ${branch}`);
  }
  return result[0].sha;
}

export async function getTree(repo: string, sha: string): Promise<TreeEntry[]> {
  const { owner, repo: name } = parseRepo(repo);
  const result = await githubFetch<{ tree: Array<{ path?: string; type?: string }> }>(
    `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`
  );
  return (result.tree || []).map((entry) => ({
    path: entry.path || "",
    type: (entry.type as "blob" | "tree" | "commit") || "blob",
  }));
}

export async function downloadFile(repo: string, commit: string, filepath: string): Promise<string> {
  const { owner, repo: name } = parseRepo(repo);
  const url = `https://raw.githubusercontent.com/${owner}/${name}/${commit}/${filepath}`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "docsee", ...getAuthHeader() } });
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 403 && text.toLowerCase().includes("rate limit")) {
        throw new GitHubRateLimitError();
      }
      const error = new Error(`${response.status} ${response.statusText}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return await response.text();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new GitHubNetworkError(error.message);
    }
    throw error;
  }
}

export async function compareCommits(
  repo: string,
  base: string,
  head: string
): Promise<{ files: Array<{ filename: string; status: string }> }> {
  const { owner, repo: name } = parseRepo(repo);
  const result = await githubFetch<{ files: Array<{ filename: string; status: string }> }>(
    `/repos/${owner}/${name}/compare/${base}...${head}`
  );
  return { files: (result.files || []).map((file) => ({ filename: file.filename, status: file.status })) };
}
