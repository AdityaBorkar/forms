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

export function isProduction(): boolean {
	return import.meta?.env?.NODE_ENV === "production";
}

export function devWarn(message: string, details?: string[]): void {
	if (isProduction()) return;
	const key = formatMessage(message, details);
	if (warnedMessages.has(key)) return;
	warnedMessages.add(key);
	console.warn(key);
}

/**
 * Single choke point for the `onMissingField` policy.
 * Dev `"throw"` throws, `"warn"` (or any production miss) warns and returns
 * `null` so callers render nothing. Keeps SmartField/SmartFieldArray in sync.
 */
export function shouldWarnOnMissing(onMissingField: OnMissingField): boolean {
	return onMissingField === "warn" || isProduction();
}

export function missingField(
	message: string,
	details: string[],
	onMissingField: OnMissingField,
): null {
	if (shouldWarnOnMissing(onMissingField)) {
		devWarn(message, details);
		return null;
	}
	throw createFormError(message, details);
}
