import fs from "node:fs/promises";
import path from "node:path";
import { DocSource } from "./config";

function normalizeMarkerName(name: string): string {
  return name.replace(/[ _]+/g, "-").toUpperCase();
}

function toDisplayName(name: string): string {
  return name
    .replace(/[ _-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part) => part.toUpperCase())
    .join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureGitignore(rootDir: string): Promise<void> {
  const gitignorePath = path.join(rootDir, ".gitignore");
  let content = "";
  try {
    content = await fs.readFile(gitignorePath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }

  if (content.includes(".docsee/")) return;

  const block = ["# docsee - downloaded docs", ".docsee/"].join("\n");
  const next = content.trim().length === 0 ? block + "\n" : content.replace(/\s*$/, "\n\n") + block + "\n";
  await fs.writeFile(gitignorePath, next, "utf8");
}

export function buildIndexBlock(source: DocSource, indexContent: string): string {
  const markerBase = normalizeMarkerName(source.name);
  const startMarker = `<!-- ${markerBase}-Docs-START -->`;
  const endMarker = `<!-- ${markerBase}-Docs-END -->`;
  const displayName = toDisplayName(source.name);
  const lines = [
    startMarker,
    `[${displayName} Docs Index]|root: ${source.local}`,
    `|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for ${displayName} tasks.`,
  ];

  if (indexContent.trim().length > 0) {
    lines.push(indexContent);
  }

  lines.push(endMarker);
  return lines.join("\n");
}

export async function injectIndex(
  agentsPath: string,
  source: DocSource,
  indexContent: string
): Promise<void> {
  const markerBase = normalizeMarkerName(source.name);
  const startMarker = `<!-- ${markerBase}-Docs-START -->`;
  const endMarker = `<!-- ${markerBase}-Docs-END -->`;
  const block = buildIndexBlock(source, indexContent);

  let content = "";
  try {
    content = await fs.readFile(agentsPath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }

  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  let next: string;
  if (pattern.test(content)) {
    next = content.replace(pattern, block);
  } else {
    const prefix = content.trim().length === 0 ? "" : content.replace(/\s*$/, "\n\n");
    next = prefix + block + "\n";
  }

  await fs.mkdir(path.dirname(agentsPath), { recursive: true });
  await fs.writeFile(agentsPath, next, "utf8");
  await ensureGitignore(process.cwd());
}
