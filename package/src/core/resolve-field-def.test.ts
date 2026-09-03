import { describe, expect, it } from "vitest";

import { resolveFieldDef } from "@/core/resolve-field-def";
import type { SchemaTree } from "@/types";

const tree: SchemaTree = {
	addr: {
		elementFields: {
			city: { kind: "string", optional: false },
			zip: { kind: "string", optional: false },
		},
		kind: "object",
		optional: false,
	},
	counts: {
		elementFields: {
			"0": { kind: "number", optional: false },
		},
		kind: "object",
		optional: false,
	},
	locations: {
		elementDef: {
			elementFields: {
				city: { kind: "string", optional: false },
			},
			kind: "object",
			optional: false,
		},
		elementFields: {
			city: { kind: "string", optional: false },
		},
		kind: "array",
		optional: false,
	},
	tags: {
		elementDef: { kind: "string", optional: false },
		kind: "array",
		optional: false,
	},
};

describe("resolveFieldDef", () => {
	it("resolves a top-level field", () => {
		expect(resolveFieldDef(tree, "addr").kind).toBe("object");
	});

	it("resolves a nested object path", () => {
		expect(resolveFieldDef(tree, "addr.city").kind).toBe("string");
	});

	it("resolves an indexed array-object path", () => {
		expect(resolveFieldDef(tree, "locations.0.city").kind).toBe("string");
	});

	it("resolves a primitive array element path", () => {
		expect(resolveFieldDef(tree, "tags.0").kind).toBe("string");
	});

	it("looks up numeric keys literally on objects", () => {
		expect(resolveFieldDef(tree, "counts.0").kind).toBe("number");
	});

	it("throws on empty segments instead of silently skipping", () => {
		expect(() => resolveFieldDef(tree, "addr..city")).toThrow("empty segment");
		expect(() => resolveFieldDef(tree, "")).toThrow("non-empty");
	});

	it("throws for unknown nested segments", () => {
		expect(() => resolveFieldDef(tree, "addr.missing")).toThrow(
			'Could not resolve segment "missing"',
		);
	});
});
