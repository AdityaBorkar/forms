import { describe, expect, it } from "vitest";
import z from "zod";

import { buildFieldMap } from "@/adapters/zod/build-field-map";

describe("buildFieldMap — string kinds", () => {
  it("maps a plain string to kind string with min/max/required", () => {
    const map = buildFieldMap(z.object({ name: z.string().min(1).max(10) }));
    expect(map.name).toEqual({
      checks: [
        { type: "min", value: 1 },
        { type: "max", value: 10 },
      ],
      kind: "string",
      max: 10,
      meta: undefined,
      min: 1,
      optional: false,
      required: true,
    });
  });

  it("maps a string with no min as not required", () => {
    const map = buildFieldMap(z.object({ note: z.string() }));
    expect(map.note.required).toBe(false);
    expect(map.note.min).toBeUndefined();
  });

  it("respects meta.component override to textarea/password/combobox/checkbox", () => {
    const map = buildFieldMap(
      z.object({
        checkbox: z.string().meta({ component: "checkbox" }),
        combobox: z.string().min(1).meta({ component: "combobox" }),
        password: z.string().meta({ component: "password" }),
        textarea: z.string().meta({ component: "textarea" }),
      }),
    );
    expect(map.textarea.kind).toBe("textarea");
    expect(map.password.kind).toBe("password");
    expect(map.combobox.kind).toBe("combobox");
    expect(map.checkbox.kind).toBe("checkbox");
    // combobox retains string-derived min/required
    expect(map.combobox.min).toBe(1);
    expect(map.combobox.required).toBe(true);
  });

  it("preserves meta passthrough fields", () => {
    const map = buildFieldMap(
      z.object({ name: z.string().meta({ label: "Name", placeholder: "x" }) }),
    );
    expect(map.name.meta).toEqual({ label: "Name", placeholder: "x" });
  });
});

describe("buildFieldMap — email/url", () => {
  it("maps z.email() to kind email", () => {
    const map = buildFieldMap(z.object({ email: z.email() }));
    expect(map.email.kind).toBe("email");
    expect(map.email.optional).toBe(false);
  });

  it("maps z.url() to kind url", () => {
    const map = buildFieldMap(z.object({ site: z.url() }));
    expect(map.site.kind).toBe("url");
  });

  it("maps deprecated z.string().email() to kind email", () => {
    const map = buildFieldMap(z.object({ email: z.string().email() }));
    expect(map.email.kind).toBe("email");
  });
});

describe("buildFieldMap — number", () => {
  it("maps z.number() with min/max via inclusive greater_than/less_than", () => {
    const map = buildFieldMap(
      z.object({ age: z.number().int().min(0).max(100) }),
    );
    expect(map.age.kind).toBe("number");
    expect(map.age.min).toBe(0);
    expect(map.age.max).toBe(100);
    expect(map.age.required).toBe(true);
  });
});

describe("buildFieldMap — boolean / enum / date / record", () => {
  it("maps z.boolean()", () => {
    const map = buildFieldMap(z.object({ active: z.boolean() }));
    expect(map.active).toEqual({
      kind: "boolean",
      optional: false,
      required: false,
    });
  });

  it("maps z.enum() with entries", () => {
    const map = buildFieldMap(z.object({ status: z.enum(["a", "b"]) }));
    expect(map.status.kind).toBe("enum");
    expect(map.status.entries).toEqual({ a: "a", b: "b" });
  });

  it("maps z.date()", () => {
    const map = buildFieldMap(z.object({ when: z.date() }));
    expect(map.when.kind).toBe("date");
  });

  it("maps z.record() to unknown", () => {
    const map = buildFieldMap(
      z.object({ perms: z.record(z.string(), z.array(z.string())) }),
    );
    expect(map.perms.kind).toBe("unknown");
  });
});

describe("buildFieldMap — array / object", () => {
  it("maps z.array(z.object()) with nested element fields", () => {
    const map = buildFieldMap(
      z.object({
        locations: z
          .array(z.object({ city: z.string().min(1), country: z.string() }))
          .min(1)
          .max(5),
      }),
    );
    expect(map.locations.kind).toBe("array");
    expect(map.locations.min).toBe(1);
    expect(map.locations.max).toBe(5);
    expect(map.locations.fields?.city.kind).toBe("string");
    expect(map.locations.fields?.city.required).toBe(true);
    expect(map.locations.fields?.country.kind).toBe("string");
  });

  it("maps z.object() with nested fields", () => {
    const map = buildFieldMap(
      z.object({ addr: z.object({ city: z.string(), zip: z.string() }) }),
    );
    expect(map.addr.kind).toBe("object");
    expect(map.addr.fields?.city.kind).toBe("string");
    expect(map.addr.fields?.zip.kind).toBe("string");
  });
});

describe("buildFieldMap — optional / union / literal", () => {
  it("unwraps optional and sets optional: true on inner def", () => {
    const map = buildFieldMap(z.object({ name: z.string().min(1).optional() }));
    expect(map.name.kind).toBe("string");
    expect(map.name.optional).toBe(true);
    expect(map.name.min).toBe(1);
    expect(map.name.required).toBe(false);
  });

  it("unwraps optional and preserves wrapper meta over inner meta", () => {
    const map = buildFieldMap(
      z.object({
        name: z
          .string()
          .meta({ label: "Inner" })
          .optional()
          .meta({ label: "Wrapper" }),
      }),
    );
    expect(map.name.optional).toBe(true);
    expect(map.name.meta?.label).toBe("Wrapper");
  });

  it("resolves a union of optional(email) | literal() to email, optional", () => {
    const map = buildFieldMap(
      z.object({ email: z.string().email().optional().or(z.literal("")) }),
    );
    expect(map.email.kind).toBe("email");
    expect(map.email.optional).toBe(true);
  });

  it("maps a bare literal to unknown", () => {
    const map = buildFieldMap(z.object({ flag: z.literal("yes") }));
    expect(map.flag.kind).toBe("unknown");
  });
});

describe("buildFieldMap — edge cases", () => {
  it("returns empty map for non-object schema", () => {
    expect(buildFieldMap(z.string())).toEqual({});
  });

  it("returns empty map for undefined input", () => {
    expect(buildFieldMap(undefined)).toEqual({});
  });
});
