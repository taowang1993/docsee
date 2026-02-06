import fs from "node:fs/promises";
import path from "node:path";

export const ALLOWED_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst"]);

async function walkFiles(rootDir: string, currentDir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(rootDir, fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) continue;
    const relative = path.relative(rootDir, fullPath);
    files.push(relative);
  }
}

export async function generateIndex(rootDir: string): Promise<string> {
  const files: string[] = [];
  try {
    await walkFiles(rootDir, rootDir, files);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return "";
    throw error;
  }

  const groups = new Map<string, string[]>();
  for (const file of files) {
    const normalized = file.split(path.sep).join(path.posix.sep);
    const parentDir = path.posix.dirname(normalized);
    const filename = path.posix.basename(normalized);
    const key = parentDir === "." ? "" : parentDir;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(filename);
  }

  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  const lines: string[] = [];
  for (const [dir, groupFiles] of sortedGroups) {
    const sortedFiles = [...groupFiles].sort((a, b) => a.localeCompare(b));
    if (dir.length === 0) {
      lines.push(`|{${sortedFiles.join(",")}}`);
    } else {
      lines.push(`|${dir}:{${sortedFiles.join(",")}}`);
    }
  }

  return lines.join("\n");
}
