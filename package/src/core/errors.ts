const warnedMessages = new Set<string>();

function formatMessage(message: string, details?: string[]): string {
	const lines = [`[@adistack/forms] ${message}`];
	if (details?.length) {
		for (const detail of details) lines.push(`  → ${detail}`);
	}
	return lines.join("\n");
}

export function createFormError(message: string, details?: string[]): Error {
	return new Error(formatMessage(message, details));
}

export function isProduction(): boolean {
	return process?.env?.NODE_ENV === "production";
}

export function devWarn(message: string, details?: string[]): void {
	if (isProduction()) return;
	const key = formatMessage(message, details);
	if (warnedMessages.has(key)) return;
	warnedMessages.add(key);
	console.warn(key);
}
