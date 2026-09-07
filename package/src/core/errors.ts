import type { OnMissingField } from "#/types";

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

export function warn(message: string, details?: string[]): void {
	const key = formatMessage(message, details);
	if (warnedMessages.has(key)) return;
	warnedMessages.add(key);
	console.warn(key);
}

export function missingField(
	message: string,
	details: string[],
	onMissingField: OnMissingField,
): null {
	if (onMissingField === "warn") {
		warn(message, details);
		return null;
	}
	throw createFormError(message, details);
}
