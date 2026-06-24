import { describe, expect, it } from "vitest";
import z from "zod";

import type { FieldDef } from "@/types";

import { buildDefaults, deriveDefault } from "./build-defaults";
import { buildFieldMap } from "./build-field-map";

describe("deriveDefault", () => {
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
      expect(deriveDefault(def)).toEqual(expected);
    });
  }

  it("derives first enum entry as default", () => {
    expect(
      deriveDefault({
        entries: { a: "A", b: "B" },
        kind: "enum",
        optional: false,
      }),
    ).toBe("A");
  });

  it("recurses into nested object fields", () => {
    expect(
      deriveDefault({
        fields: { city: { kind: "string", optional: false } },
        kind: "object",
        optional: false,
      }),
    ).toEqual({ city: "" });
  });
});

describe("buildDefaults", () => {
  it("derives defaults for a full object schema", () => {
    const schema = z.object({
      active: z.boolean(),
      age: z.number(),
      name: z.string().min(1),
      nickname: z.string().optional(),
    });
    expect(buildDefaults(schema, buildFieldMap(schema))).toEqual({
      active: false,
      age: 0,
      name: "",
      nickname: undefined,
    });
  });

  it("merges overrides on top of derived defaults", () => {
    const schema = z.object({ age: z.number(), name: z.string() });
    expect(
      buildDefaults(schema, buildFieldMap(schema), { name: "override" }),
    ).toEqual({
      age: 0,
      name: "override",
    });
  });

  it("handles combobox (string-derived) default as empty string", () => {
    const schema = z.object({
      assigneeId: z.string().min(1).meta({ component: "combobox" }),
    });
    expect(buildDefaults(schema, buildFieldMap(schema))).toEqual({
      assigneeId: "",
    });
  });
});
