import { describe, expect, it } from "vitest";
import z from "zod";

import { createFieldMap } from "#/adapters/zod/create-field-map";

describe("createFieldMap — string kinds", () => {
	it("maps a plain string to kind string with min/max/optional", () => {
		const map = createFieldMap(z.object({ name: z.string().min(1).max(10) }));
		expect(map.name!).toEqual({
			checks: [
				{ type: "min", value: 1 },
				{ type: "max", value: 10 },
			],
			kind: "string",
			max: 10,
			min: 1,
			optional: false,
		});
	});

	it("maps a string with no min as required (optional: false)", () => {
		const map = createFieldMap(z.object({ note: z.string() }));
		expect(map.note?.optional).toBe(false);
		expect(map.note?.min).toBeUndefined();
	});

	it("preserves meta passthrough fields", () => {
		const map = createFieldMap(
			z.object({ name: z.string().meta({ label: "Name", placeholder: "x" }) }),
		);
		expect(map.name?.meta).toEqual({ label: "Name", placeholder: "x" });
	});
});

describe("createFieldMap — email/url", () => {
	it("maps z.email() to kind email", () => {
		const map = createFieldMap(z.object({ email: z.email() }));
		expect(map.email?.kind).toBe("email");
		expect(map.email?.optional).toBe(false);
	});

	it("maps z.url() to kind url", () => {
		const map = createFieldMap(z.object({ site: z.url() }));
		expect(map.site?.kind).toBe("url");
	});
});

describe("createFieldMap — number", () => {
	it("maps z.number() with min/max via inclusive greater_than/less_than", () => {
		const map = createFieldMap(
			z.object({ age: z.number().int().min(0).max(100) }),
		);
		expect(map.age?.kind).toBe("number");
		expect(map.age?.min).toBe(0);
		expect(map.age?.max).toBe(100);
		expect(map.age?.optional).toBe(false);
	});
});

describe("createFieldMap — boolean / enum / date", () => {
	it("maps z.boolean()", () => {
		const map = createFieldMap(z.object({ active: z.boolean() }));
		expect(map.active!).toEqual({
			kind: "boolean",
			optional: false,
		});
	});

	it("maps z.enum() with entries", () => {
		const map = createFieldMap(z.object({ status: z.enum(["a", "b"]) }));
		expect(map.status?.kind).toBe("enum");
		expect(map.status?.entries).toEqual({ a: "a", b: "b" });
	});

	it("maps z.date()", () => {
		const map = createFieldMap(z.object({ when: z.date() }));
		expect(map.when?.kind).toBe("date");
	});

	it("throws for z.record()", () => {
		expect(() =>
			createFieldMap(
				z.object({ perms: z.record(z.string(), z.array(z.string())) }),
			),
		).toThrow("Unsupported Zod type: record");
	});
});

describe("createFieldMap — array / object", () => {
	it("maps z.array(z.object()) with nested element fields", () => {
		const map = createFieldMap(
			z.object({
				locations: z
					.array(z.object({ city: z.string().min(1), country: z.string() }))
					.min(1)
					.max(5),
			}),
		);
		expect(map.locations?.kind).toBe("array");
		expect(map.locations?.min).toBe(1);
		expect(map.locations?.max).toBe(5);
		expect(map.locations?.elementFields).toBeUndefined();
		expect(map.locations?.elementDef?.kind).toBe("object");
		expect(map.locations?.elementDef?.elementFields?.city?.kind).toBe("string");
		expect(map.locations?.elementDef?.elementFields?.city?.optional).toBe(
			false,
		);
		expect(map.locations?.elementDef?.elementFields?.country?.kind).toBe(
			"string",
		);
	});

	it("maps z.array(z.string()) with a primitive elementDef", () => {
		const map = createFieldMap(z.object({ tags: z.array(z.string()) }));
		expect(map.tags?.kind).toBe("array");
		expect(map.tags?.elementDef?.kind).toBe("string");
	});

	it("maps z.object() with nested fields", () => {
		const map = createFieldMap(
			z.object({ addr: z.object({ city: z.string(), zip: z.string() }) }),
		);
		expect(map.addr?.kind).toBe("object");
		expect(map.addr?.elementFields?.city?.kind).toBe("string");
		expect(map.addr?.elementFields?.zip?.kind).toBe("string");
	});
});

describe("createFieldMap — optional / union", () => {
	it("unwraps optional and sets optional: true on inner def", () => {
		const map = createFieldMap(
			z.object({ name: z.string().min(1).optional() }),
		);
		expect(map.name?.kind).toBe("string");
		expect(map.name?.optional).toBe(true);
		expect(map.name?.min).toBe(1);
	});

	it("unwraps optional and merges wrapper meta over inner meta", () => {
		const map = createFieldMap(
			z.object({
				name: z
					.string()
					.meta({ label: "Inner", placeholder: "x" })
					.optional()
					.meta({ label: "Wrapper" }),
			}),
		);
		expect(map.name?.optional).toBe(true);
		expect(map.name?.meta?.label).toBe("Wrapper");
		expect(map.name?.meta?.placeholder).toBe("x");
	});

	it("resolves a union of optional(email) | literal() to email, optional", () => {
		const map = createFieldMap(
			z.object({ email: z.email().optional().or(z.literal("")) }),
		);
		expect(map.email?.kind).toBe("email");
		expect(map.email?.optional).toBe(true);
	});

	it("throws for an ambiguous union with two non-literal branches", () => {
		expect(() =>
			createFieldMap(z.object({ value: z.union([z.string(), z.number()]) })),
		).toThrow("Ambiguous union");
	});

	it("throws for a bare literal", () => {
		expect(() => createFieldMap(z.object({ flag: z.literal("yes") }))).toThrow(
			"Unsupported Zod type: literal",
		);
	});
});

describe("createFieldMap — edge cases", () => {
	it("returns empty map for non-object schema", () => {
		expect(createFieldMap(z.string())).toEqual({});
	});

	it("returns empty map for undefined input", () => {
		expect(createFieldMap(undefined)).toEqual({});
	});
});
