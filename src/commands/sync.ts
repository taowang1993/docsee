import path from "node:path";
import { readConfig, writeConfig } from "../core/config";
import { downloadSource } from "../core/download";
import { generateIndex } from "../core/index-gen";
import { injectIndex } from "../core/inject";
import { getLatestCommit } from "../utils/github";
import { formatError, handleCommonErrors } from "../utils/cli";

export async function syncCommand(name?: string): Promise<void> {
  let config;
  try {
    config = await readConfig();
  } catch (error) {
    if (handleCommonErrors(error)) return;
    throw error;
  }

  let sources = config.sources;
  if (name) {
    const match = sources.find((source) => source.name === name);
    if (!match) {
      console.error(`Source '${name}' not found in docsee.yaml`);
      process.exitCode = 1;
      return;
    }
    sources = [match];
  }

  const agentsPath = path.resolve(process.cwd(), config.agents_md);
  let hadError = false;

  for (const source of sources) {
    try {
      const latestCommit = await getLatestCommit(source.repo, source.branch);
      const fileCount = await downloadSource(source, latestCommit);
      const indexContent = await generateIndex(source.local);
      await injectIndex(agentsPath, source, indexContent);
      source.commit = latestCommit;
      await writeConfig(config);
      console.log(`✓ ${source.name}: synced ${fileCount} files (${latestCommit.slice(0, 7)})`);
    } catch (error) {
      hadError = true;
      console.error(`${source.name}: ${formatError(error)}`);
      continue;
    }
  }

  if (hadError) process.exitCode = 1;
}
