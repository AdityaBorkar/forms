import * as v from "valibot";
import { describe, expect, it } from "vitest";

import type { FieldDef, SchemaTree } from "@/types";
import { buildDefaults } from "./build-defaults";
import { buildFieldMap } from "./build-field-map";

function fieldMap(...entries: Array<[string, FieldDef]>): SchemaTree {
	return Object.fromEntries(entries);
}

describe("buildDefaults — per-kind derivation", () => {
	const cases: Array<[FieldDef, unknown]> = [
		[{ kind: "string", optional: false }, ""],
		[{ kind: "email", optional: false }, ""],
		[{ kind: "url", optional: false }, ""],
		[{ kind: "password", optional: false }, ""],
		[{ kind: "textarea", optional: false }, ""],
		[{ kind: "combobox", optional: false }, ""],
		[{ kind: "number", optional: false }, 0],
		[{ kind: "boolean", optional: false }, false],
		[{ kind: "checkbox", optional: false }, false],
		[{ kind: "array", optional: false }, []],
		[{ kind: "unknown", optional: false }, undefined],
		[{ kind: "date", optional: false }, undefined],
		[{ kind: "string", optional: true }, undefined],
	];
	for (const [def, expected] of cases) {
		it(`derives ${JSON.stringify(expected)} for kind=${def.kind} optional=${def.optional}`, () => {
			expect(buildDefaults(undefined, fieldMap(["x", def]))).toEqual({
				x: expected,
			});
		});
	}

	it("derives first enum entry as default", () => {
		expect(
			buildDefaults(
				undefined,
				fieldMap([
					"status",
					{ entries: { a: "A", b: "B" }, kind: "enum", optional: false },
				]),
			),
		).toEqual({ status: "A" });
	});

	it("recurses into nested object fields", () => {
		expect(
			buildDefaults(
				undefined,
				fieldMap([
					"addr",
					{
						elementFields: { city: { kind: "string", optional: false } },
						kind: "object",
						optional: false,
					},
				]),
			),
		).toEqual({ addr: { city: "" } });
	});
});

describe("buildDefaults", () => {
	it("derives defaults for a full object schema", () => {
		const schema = v.object({
			active: v.boolean(),
			age: v.number(),
			name: v.pipe(v.string(), v.minLength(1)),
			nickname: v.optional(v.string()),
		});
		expect(buildDefaults(schema, buildFieldMap(schema))).toEqual({
			active: false,
			age: 0,
			name: "",
			nickname: undefined,
		});
	});

	it("merges overrides on top of derived defaults", () => {
		const schema = v.object({ age: v.number(), name: v.string() });
		expect(
			buildDefaults(schema, buildFieldMap(schema), { name: "override" }),
		).toEqual({
			age: 0,
			name: "override",
		});
	});

	it("handles metadata-annotated string default as empty string", () => {
		const schema = v.object({
			assigneeId: v.pipe(
				v.string(),
				v.minLength(1),
				v.metadata({ label: "Assignee" }),
			),
		});
		expect(buildDefaults(schema, buildFieldMap(schema))).toEqual({
			assigneeId: "",
		});
	});
});
