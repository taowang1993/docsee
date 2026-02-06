import { readConfig } from "../core/config";
import { compareCommits } from "../utils/github";
import { formatError, handleCommonErrors } from "../utils/cli";

export async function diffCommand(name?: string): Promise<void> {
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

  let hadError = false;
  for (const source of sources) {
    if (!source.commit) {
      console.log(`${source.name}: never synced, run 'docsee sync'`);
      continue;
    }

    try {
      const comparison = await compareCommits(source.repo, source.commit, source.branch);
      const scopedFiles = comparison.files.filter((file) => file.filename.startsWith(`${source.path}/`));

      if (scopedFiles.length === 0) {
        console.log(`${source.name}: no changes`);
        continue;
      }

      console.log(`${source.name}:`);
      for (const file of scopedFiles) {
        const status = `${file.status}:`;
        const label = status.padEnd(10, " ");
        console.log(`  ${label} ${file.filename}`);
      }
    } catch (error) {
      hadError = true;
      console.error(`${source.name}: ${formatError(error)}`);
    }
  }

  if (hadError) process.exitCode = 1;
}
