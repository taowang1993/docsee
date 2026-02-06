import { Command } from "commander";
import { initCommand } from "./commands/init";
import { addCommand } from "./commands/add";
import { syncCommand } from "./commands/sync";
import { statusCommand } from "./commands/status";
import { diffCommand } from "./commands/diff";
import { handleCommonErrors } from "./utils/cli";

async function run(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (handleCommonErrors(error)) return;
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name("docsee")
  .description("Keep AGENTS.md docs in sync with upstream repos")
  .version("0.1.0")
  .addHelpText(
    "after",
    "\nEnvironment:\n  GITHUB_TOKEN  GitHub token for higher rate limits\n"
  );

program
  .command("init")
  .description("Create docsee.yaml config")
  .action(() => run(initCommand));

program
  .command("add")
  .argument("<source>", "GitHub URL or owner/repo")
  .option("-n, --name <name>", "Short name for this source")
  .description("Add a docs source")
  .action((source: string, opts: { name?: string }) => run(() => addCommand(source, opts)));

program
  .command("sync")
  .argument("[name]", "Optional source name to sync")
  .description("Download docs + regenerate AGENTS.md index")
  .action((name?: string) => run(() => syncCommand(name)));

program
  .command("status")
  .argument("[name]", "Optional source name to check")
  .description("Check if local docs are behind upstream")
  .action((name?: string) => run(() => statusCommand(name)));

program
  .command("diff")
  .argument("[name]", "Optional source name to diff")
  .description("Show what changed upstream since last sync")
  .action((name?: string) => run(() => diffCommand(name)));

program.parseAsync(process.argv);
