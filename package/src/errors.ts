const PREFIX = "[@adistack/forms]";

export function createFormError(message: string, details?: string[]): Error {
  const lines = [`${PREFIX} ${message}`];
  if (details?.length) {
    for (const detail of details) lines.push(`  → ${detail}`);
  }
  return new Error(lines.join("\n"));
}

export function devWarn(message: string, details?: string[]): void {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    .process?.env;
  if (env?.NODE_ENV === "production") return;
  const lines = [`${PREFIX} ${message}`];
  if (details?.length) {
    for (const detail of details) lines.push(`  → ${detail}`);
  }
  console.warn(lines.join("\n"));
}
