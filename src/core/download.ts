import fs from "node:fs/promises";
import path from "node:path";
import { DocSource } from "./config";
import { getTree, downloadFile } from "../utils/github";
import { ALLOWED_EXTENSIONS } from "./index-gen";

function normalizeDocsPath(docsPath: string): string {
  return docsPath.replace(/\/+$/, "");
}

function isAllowedExtension(filePath: string): boolean {
  const ext = path.posix.extname(filePath);
  return ALLOWED_EXTENSIONS.has(ext);
}

async function walkLocalFiles(rootDir: string, currentDir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkLocalFiles(rootDir, fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = path.relative(rootDir, fullPath);
    files.push(relative);
  }
}

async function runWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current]);
    }
  });
  await Promise.all(workers);
}

export async function downloadSource(source: DocSource, commit: string): Promise<number> {
  const docsPath = normalizeDocsPath(source.path);
  const tree = await getTree(source.repo, commit);

  const files = tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(`${docsPath}/`))
    .filter((entry) => isAllowedExtension(entry.path));

  const expectedRelPaths = new Set<string>();
  const downloadItems = files.map((entry) => {
    const relativePath = entry.path.slice(docsPath.length + 1);
    expectedRelPaths.add(relativePath);
    return { repoPath: entry.path, relativePath };
  });

  await runWithLimit(downloadItems, 10, async (item) => {
    const content = await downloadFile(source.repo, commit, item.repoPath);
    const localPath = path.join(source.local, ...item.relativePath.split("/"));
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, content, "utf8");
  });

  const existingFiles: string[] = [];
  try {
    await walkLocalFiles(source.local, source.local, existingFiles);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw error;
  }

  for (const file of existingFiles) {
    const normalized = file.split(path.sep).join(path.posix.sep);
    if (!isAllowedExtension(normalized)) continue;
    if (!expectedRelPaths.has(normalized)) {
      const fullPath = path.join(source.local, file);
      await fs.unlink(fullPath);
    }
  }

  return expectedRelPaths.size;
}
