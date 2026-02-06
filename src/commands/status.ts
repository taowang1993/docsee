import { readConfig } from "../core/config";
import { getLatestCommit } from "../utils/github";
import { formatError, handleCommonErrors } from "../utils/cli";

export async function statusCommand(name?: string): Promise<void> {
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

  let hasIssues = false;
  for (const source of sources) {
    if (!source.commit) {
      console.log(`${source.name}: never synced`);
      hasIssues = true;
      continue;
    }
    try {
      const latestCommit = await getLatestCommit(source.repo, source.branch);
      if (latestCommit === source.commit) {
        console.log(`${source.name}: up to date (${source.commit.slice(0, 7)})`);
      } else {
        console.log(
          `${source.name}: behind upstream (local: ${source.commit.slice(0, 7)} → remote: ${latestCommit.slice(0, 7)})`
        );
        hasIssues = true;
      }
    } catch (error) {
      console.error(`${source.name}: ${formatError(error)}`);
      hasIssues = true;
    }
  }

  if (hasIssues) process.exitCode = 1;
}
