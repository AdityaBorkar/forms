const PREFIX = "[@adistack/forms]";

export function createFormError(message: string, details?: string[]): Error {
	const lines = [`${PREFIX} ${message}`];
	if (details?.length) {
		for (const detail of details) lines.push(`  → ${detail}`);
	}
	return new Error(lines.join("\n"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getNodeEnv(): string | undefined {
	const process = Reflect.get(globalThis, "process");
	if (!isRecord(process)) return undefined;
	const env = Reflect.get(process, "env");
	if (!isRecord(env)) return undefined;
	const nodeEnv = Reflect.get(env, "NODE_ENV");
	return typeof nodeEnv === "string" ? nodeEnv : undefined;
}

export function devWarn(message: string, details?: string[]): void {
	if (getNodeEnv() === "production") return;
	const lines = [`${PREFIX} ${message}`];
	if (details?.length) {
		for (const detail of details) lines.push(`  → ${detail}`);
	}
	console.warn(lines.join("\n"));
}
