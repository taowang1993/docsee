import { createInterface } from "node:readline";
import path from "node:path";
import { readOrCreateConfig, writeConfig } from "../core/config";
import { getLatestCommit, getRepoInfo, getTree } from "../utils/github";
import { handleCommonErrors } from "../utils/cli";
import { parseSource } from "../utils/parse-source";
import { downloadSource } from "../core/download";
import { generateIndex } from "../core/index-gen";
import { injectIndex } from "../core/inject";

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

function ask(rl: ReturnType<typeof createInterface>, question: string, fallback: string): Promise<string> {
  const prompt = `${question} [${fallback}]: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      const trimmed = answer.trim();
      resolve(trimmed.length === 0 ? fallback : trimmed);
    });
  });
}

export interface AddOptions {
  name?: string;
}

export async function addCommand(input: string, opts: AddOptions = {}): Promise<void> {
  const parsed = parseSource(input);

  if (!parsed && !REPO_PATTERN.test(input)) {
    console.error("Invalid input. Use a GitHub URL or owner/repo format.");
    console.error("  Example: docsee add https://github.com/vercel/ai/tree/main/content/docs");
    process.exitCode = 1;
    return;
  }

  let config;
  try {
    config = await readOrCreateConfig();
  } catch (error) {
    if (handleCommonErrors(error)) return;
    throw error;
  }

  const repo = parsed ? parsed.repo : input;

  let defaultBranch: string;
  try {
    const info = await getRepoInfo(repo);
    defaultBranch = info.defaultBranch;
  } catch (error) {
    if (handleCommonErrors(error)) return;
    const err = error as { status?: number };
    if (err.status === 404) {
      console.error(`Repository not found: ${repo}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const repoName = repo.split("/")[1] || repo;

  let resolved: { docsPath: string; name: string; branch: string };
  if (parsed) {
    resolved = {
      docsPath: parsed.path.replace(/\/+$/, ""),
      name: opts.name || repoName,
      branch: parsed.branch,
    };
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const rawDocsPath = await ask(rl, "Path to docs directory in repo", "docs");
    const docsPath = rawDocsPath.replace(/\/+$/, "");
    const name = opts.name || await ask(rl, "Short name for this source", repoName);
    const branch = await ask(rl, "Branch to track", defaultBranch);
    rl.close();
    resolved = { docsPath, name, branch };
  }

  let commit: string;
  try {
    commit = await getLatestCommit(repo, resolved.branch);
  } catch (error) {
    if (handleCommonErrors(error)) return;
    throw error;
  }

  let tree;
  try {
    tree = await getTree(repo, commit);
  } catch (error) {
    if (handleCommonErrors(error)) return;
    throw error;
  }

  const pathExists = tree.some(
    (entry) =>
      (entry.path === resolved.docsPath && entry.type === "tree") ||
      entry.path.startsWith(`${resolved.docsPath}/`)
  );

  if (!pathExists) {
    console.error(`Path '${resolved.docsPath}' not found in ${repo}`);
    process.exitCode = 1;
    return;
  }

  if (config.sources.some((source) => source.name === resolved.name)) {
    console.error(`Source '${resolved.name}' already exists`);
    process.exitCode = 1;
    return;
  }

  const source = {
    name: resolved.name,
    repo,
    path: resolved.docsPath,
    branch: resolved.branch,
    local: `./.docsee/${resolved.name}`,
    commit: null as string | null,
  };

  config.sources.push(source);
  await writeConfig(config);

  const agentsPath = path.resolve(process.cwd(), config.agents_md);
  const fileCount = await downloadSource(source, commit);
  const indexContent = await generateIndex(source.local);
  await injectIndex(agentsPath, source, indexContent);
  source.commit = commit;
  await writeConfig(config);

  console.log(`✓ ${resolved.name}: added and synced ${fileCount} files (${commit.slice(0, 7)})`);
}
