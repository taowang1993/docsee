import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export const CONFIG_FILENAME = "docsee.yaml";

export interface DocSource {
  name: string;
  repo: string;
  path: string;
  branch: string;
  local: string;
  commit: string | null;
}

export interface DocseeConfig {
  agents_md: string;
  sources: DocSource[];
}

export class ConfigNotFoundError extends Error {
  code = "DOCSEE_NO_CONFIG";
  constructor() {
    super("No docsee.yaml found");
  }
}

export class ConfigParseError extends Error {
  code = "DOCSEE_INVALID_YAML";
  constructor(message: string) {
    super(message);
  }
}

export function getConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

export function defaultConfig(): DocseeConfig {
  return { agents_md: "./AGENTS.md", sources: [] };
}

export async function readConfig(): Promise<DocseeConfig> {
  const configPath = getConfigPath();
  let content: string;
  try {
    content = await fs.readFile(configPath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new ConfigNotFoundError();
    }
    throw error;
  }

  try {
    const parsed = YAML.parse(content) as DocseeConfig;
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid YAML structure");
    }
    if (!Array.isArray(parsed.sources)) {
      parsed.sources = [];
    }
    return parsed;
  } catch (error) {
    const err = error as Error;
    throw new ConfigParseError(err.message);
  }
}

export async function readOrCreateConfig(): Promise<DocseeConfig> {
  try {
    return await readConfig();
  } catch (error) {
    if (error instanceof ConfigNotFoundError) {
      const config = defaultConfig();
      await writeConfig(config);
      return config;
    }
    throw error;
  }
}

export async function writeConfig(config: DocseeConfig): Promise<void> {
  const configPath = getConfigPath();
  const yaml = YAML.stringify(config);
  await fs.writeFile(configPath, yaml, "utf8");
}
