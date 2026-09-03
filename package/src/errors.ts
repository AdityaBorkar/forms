const PREFIX = "[@adistack/forms]";

function formatMessage(message: string, details?: string[]): string {
	const lines = [`${PREFIX} ${message}`];
	if (details?.length) {
		for (const detail of details) lines.push(`  → ${detail}`);
	}
	return lines.join("\n");
}

export function createFormError(message: string, details?: string[]): Error {
	return new Error(formatMessage(message, details));
}

function getNodeEnv(): string | undefined {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: unknown } } })
		.process?.env?.NODE_ENV;
	return typeof nodeEnv === "string" ? nodeEnv : undefined;
}

const warnedMessages = new Set<string>();

export function isProduction(): boolean {
	return getNodeEnv() === "production";
}

export function devWarn(message: string, details?: string[]): void {
	if (getNodeEnv() === "production") return;
	const key = formatMessage(message, details);
	if (warnedMessages.has(key)) return;
	warnedMessages.add(key);
	console.warn(key);
}

/** Reset deduped warnings. Intended for tests only. */
export function resetDevWarnings(): void {
	warnedMessages.clear();
}
