import { ConfigNotFoundError, ConfigParseError } from "../core/config";
import { GitHubNetworkError, GitHubRateLimitError } from "./github";

export function formatError(error: unknown): string {
  if (error instanceof GitHubRateLimitError) return error.message;
  if (error instanceof GitHubNetworkError) return `Network error: ${error.message}`;
  if (error instanceof ConfigParseError) return `Failed to parse docsee.yaml: ${error.message}`;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function handleCommonErrors(error: unknown): boolean {
  if (error instanceof ConfigNotFoundError) {
    console.error("No docsee.yaml found. Run 'docsee init' first.");
    process.exitCode = 1;
    return true;
  }
  if (error instanceof ConfigParseError) {
    console.error(`Failed to parse docsee.yaml: ${error.message}`);
    process.exitCode = 1;
    return true;
  }
  if (error instanceof GitHubRateLimitError) {
    console.error(error.message);
    process.exitCode = 1;
    return true;
  }
  if (error instanceof GitHubNetworkError) {
    console.error(`Network error: ${error.message}`);
    process.exitCode = 1;
    return true;
  }
  return false;
}
