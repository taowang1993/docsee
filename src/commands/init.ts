import fs from "node:fs/promises";
import { DocseeConfig, getConfigPath, writeConfig } from "../core/config";

export async function initCommand(): Promise<void> {
  const configPath = getConfigPath();
  try {
    await fs.access(configPath);
    console.log("docsee.yaml already exists");
    return;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }

  const config: DocseeConfig = {
    agents_md: "./AGENTS.md",
    sources: [],
  };

  await writeConfig(config);
  console.log("Created docsee.yaml");
}
