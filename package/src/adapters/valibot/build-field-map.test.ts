import * as v from "valibot";
import { describe, expect, it } from "vitest";

import { buildFieldMap } from "@/adapters/valibot/build-field-map";

describe("buildFieldMap — string kinds", () => {
	it("maps a piped string to kind string with min/max/optional", () => {
		const map = buildFieldMap(
			v.object({
				name: v.pipe(v.string(), v.minLength(1), v.maxLength(10)),
			}),
		);
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
		const map = buildFieldMap(v.object({ note: v.string() }));
		expect(map.note?.optional).toBe(false);
		expect(map.note?.min).toBeUndefined();
	});

	it("preserves meta passthrough fields", () => {
		const map = buildFieldMap(
			v.object({
				name: v.pipe(
					v.string(),
					v.metadata({ label: "Name", placeholder: "x" }),
				),
			}),
		);
		expect(map.name?.meta).toEqual({ label: "Name", placeholder: "x" });
	});

	it("honors metadata component as a kind override", () => {
		const map = buildFieldMap(
			v.object({
				bio: v.pipe(v.string(), v.metadata({ component: "textarea" })),
			}),
		);
		expect(map.bio?.kind).toBe("textarea");
	});
});

describe("buildFieldMap — email/url", () => {
	it("maps a piped email to kind email", () => {
		const map = buildFieldMap(
			v.object({ email: v.pipe(v.string(), v.email()) }),
		);
		expect(map.email?.kind).toBe("email");
		expect(map.email?.optional).toBe(false);
	});

	it("maps a piped url to kind url", () => {
		const map = buildFieldMap(v.object({ site: v.pipe(v.string(), v.url()) }));
		expect(map.site?.kind).toBe("url");
	});
});

describe("buildFieldMap — number", () => {
	it("maps v.number() with min/max via minValue/maxValue", () => {
		const map = buildFieldMap(
			v.object({
				age: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
			}),
		);
		expect(map.age?.kind).toBe("number");
		expect(map.age?.min).toBe(0);
		expect(map.age?.max).toBe(100);
		expect(map.age?.optional).toBe(false);
	});

	it("maps gt/lt bounds to checks", () => {
		const map = buildFieldMap(
			v.object({ score: v.pipe(v.number(), v.gtValue(5), v.ltValue(10)) }),
		);
		expect(map.score?.kind).toBe("number");
		expect(map.score?.min).toBeUndefined();
		expect(map.score?.checks).toEqual([
			{ type: "gt", value: 5 },
			{ type: "lt", value: 10 },
		]);
	});
});

describe("buildFieldMap — boolean / enum / date", () => {
	it("maps v.boolean()", () => {
		const map = buildFieldMap(v.object({ active: v.boolean() }));
		expect(map.active!).toEqual({
			kind: "boolean",
			optional: false,
		});
	});

	it("maps v.picklist() with entries", () => {
		const map = buildFieldMap(v.object({ status: v.picklist(["a", "b"]) }));
		expect(map.status?.kind).toBe("enum");
		expect(map.status?.entries).toEqual({ a: "a", b: "b" });
	});

	it("maps v.enum_() with entries", () => {
		const map = buildFieldMap(
			v.object({ status: v.enum_({ A: "a", B: "b" }) }),
		);
		expect(map.status?.kind).toBe("enum");
		expect(map.status?.entries).toEqual({ A: "a", B: "b" });
	});

	it("maps v.date()", () => {
		const map = buildFieldMap(v.object({ when: v.date() }));
		expect(map.when?.kind).toBe("date");
	});

	it("throws for v.record()", () => {
		expect(() =>
			buildFieldMap(
				v.object({ perms: v.record(v.string(), v.array(v.string())) }),
			),
		).toThrow("Unsupported Valibot type: record");
	});
});

describe("buildFieldMap — array / object", () => {
	it("maps v.array(v.object()) with nested element fields", () => {
		const map = buildFieldMap(
			v.object({
				locations: v.pipe(
					v.array(
						v.object({
							city: v.pipe(v.string(), v.minLength(1)),
							country: v.string(),
						}),
					),
					v.minLength(1),
					v.maxLength(5),
				),
			}),
		);
		expect(map.locations?.kind).toBe("array");
		expect(map.locations?.min).toBe(1);
		expect(map.locations?.max).toBe(5);
		expect(map.locations?.elementFields?.city?.kind).toBe("string");
		expect(map.locations?.elementFields?.city?.optional).toBe(false);
		expect(map.locations?.elementFields?.country?.kind).toBe("string");
		expect(map.locations?.elementDef?.kind).toBe("object");
	});

	it("maps v.array(v.string()) with a primitive elementDef", () => {
		const map = buildFieldMap(v.object({ tags: v.array(v.string()) }));
		expect(map.tags?.kind).toBe("array");
		expect(map.tags?.elementDef?.kind).toBe("string");
	});

	it("maps v.object() with nested fields", () => {
		const map = buildFieldMap(
			v.object({ addr: v.object({ city: v.string(), zip: v.string() }) }),
		);
		expect(map.addr?.kind).toBe("object");
		expect(map.addr?.elementFields?.city?.kind).toBe("string");
		expect(map.addr?.elementFields?.zip?.kind).toBe("string");
	});
});

describe("buildFieldMap — optional / union", () => {
	it("unwraps optional and sets optional: true on inner def", () => {
		const map = buildFieldMap(
			v.object({ name: v.optional(v.pipe(v.string(), v.minLength(1))) }),
		);
		expect(map.name?.kind).toBe("string");
		expect(map.name?.optional).toBe(true);
		expect(map.name?.min).toBe(1);
	});

	it("treats nullish as optional", () => {
		const map = buildFieldMap(v.object({ name: v.nullish(v.string()) }));
		expect(map.name?.optional).toBe(true);
	});

	it("treats nullable alone as required (null is a value)", () => {
		const map = buildFieldMap(v.object({ name: v.nullable(v.string()) }));
		expect(map.name?.optional).toBe(false);
		expect(map.name?.kind).toBe("string");
	});

	it("unwraps optional and merges wrapper meta over inner meta", () => {
		const map = buildFieldMap(
			v.object({
				name: v.pipe(
					v.optional(
						v.pipe(
							v.string(),
							v.metadata({ label: "Inner", placeholder: "x" }),
						),
					),
					v.metadata({ label: "Wrapper" }),
				),
			}),
		);
		expect(map.name?.optional).toBe(true);
		expect(map.name?.meta?.label).toBe("Wrapper");
		expect(map.name?.meta?.placeholder).toBe("x");
	});

	it("resolves a union of optional(email) | literal() to email, optional", () => {
		const map = buildFieldMap(
			v.object({
				email: v.union([
					v.optional(v.pipe(v.string(), v.email())),
					v.literal(""),
				]),
			}),
		);
		expect(map.email?.kind).toBe("email");
		expect(map.email?.optional).toBe(true);
	});

	it("throws for an ambiguous union with two non-literal branches", () => {
		expect(() =>
			buildFieldMap(v.object({ value: v.union([v.string(), v.number()]) })),
		).toThrow("Ambiguous union");
	});

	it("throws for a bare literal", () => {
		expect(() => buildFieldMap(v.object({ flag: v.literal("yes") }))).toThrow(
			"Unsupported Valibot type: literal",
		);
	});
});

describe("buildFieldMap — edge cases", () => {
	it("returns empty map for non-object schema", () => {
		expect(buildFieldMap(v.string())).toEqual({});
	});

	it("returns empty map for undefined input", () => {
		expect(buildFieldMap(undefined)).toEqual({});
	});
});
