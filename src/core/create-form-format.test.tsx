// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import z from "zod";

import { zodAdapter } from "@/adapters/zod/index";
import { createFormFormat } from "@/core/create-form-format";
import type { FieldRenderProps } from "@/types";

afterEach(cleanup);

function makeStub(kind: string) {
  return function StubField({
    name,
    value,
    onChange,
    error,
  }: FieldRenderProps) {
    return (
      <div>
        <input
          data-testid={`field-${kind}`}
          id={name}
          name={name}
          // biome-ignore lint/performance/noJsxPropsBind: test stub — render perf is irrelevant
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          value={(value as string) ?? ""}
        />
        {error ? <span data-testid="field-error">{error}</span> : null}
      </div>
    );
  };
}

const { Form, SmartField, SmartFieldArray, useForm } = createFormFormat({
  fieldMap: {
    array: makeStub("array"),
    combobox: makeStub("combobox"),
    email: makeStub("email"),
    number: makeStub("number"),
    object: makeStub("object"),
    string: makeStub("string"),
    unknown: makeStub("unknown"),
  },
  schemaResolver: zodAdapter,
});

function FormHarness({
  schema,
  onSubmit,
  defaultValues,
  children,
}: {
  schema: z.ZodType;
  onSubmit: (values: Record<string, unknown>) => void;
  defaultValues?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const form = useForm({ defaultValues, onSubmit, schema });
  return <Form form={form}>{children}</Form>;
}

describe("createFormFormat — component resolution", () => {
  it("SmartField resolves the component by kind", () => {
    const schema = z.object({
      count: z.number(),
      email: z.email(),
      name: z.string(),
    });
    render(
      <FormHarness onSubmit={vi.fn()} schema={schema}>
        <SmartField name="name" />
        <SmartField name="email" />
        <SmartField name="count" />
      </FormHarness>,
    );
    expect(screen.getByTestId("field-string")).toBeTruthy();
    expect(screen.getByTestId("field-email")).toBeTruthy();
    expect(screen.getByTestId("field-number")).toBeTruthy();
  });

  it("renders nothing for an unknown field name", () => {
    const schema = z.object({ name: z.string() });
    render(
      <FormHarness onSubmit={vi.fn()} schema={schema}>
        <SmartField name="missing" />
      </FormHarness>,
    );
    expect(screen.queryByTestId("field-string")).toBeNull();
  });
});

describe("createFormFormat — nested paths", () => {
  it("SmartField resolves a nested array element path", () => {
    const schema = z.object({
      locations: z.array(z.object({ city: z.string().min(1) })),
    });
    render(
      <FormHarness onSubmit={vi.fn()} schema={schema}>
        <SmartFieldArray name="locations">
          {({ fields, append }) => (
            <>
              {fields.map((f, i) => (
                <SmartField key={f.id} name={`locations.${i}.city`} />
              ))}
              {/* biome-ignore lint/performance/noJsxPropsBind: test — render perf is irrelevant */}
              <button onClick={() => append({ city: "" })} type="button">
                add
              </button>
            </>
          )}
        </SmartFieldArray>
      </FormHarness>,
    );
    expect(screen.queryByTestId("field-string")).toBeNull();
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("field-string")).toBeTruthy();
  });
});

describe("createFormFormat — submission & validation", () => {
  it("submits validated values", async () => {
    const schema = z.object({ name: z.string().min(1) });
    const onSubmit = vi.fn();
    render(
      <FormHarness onSubmit={onSubmit} schema={schema}>
        <SmartField name="name" />
        <button type="submit">submit</button>
      </FormHarness>,
    );
    fireEvent.change(screen.getByTestId("field-string"), {
      target: { value: "Alice" },
    });
    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: "Alice" });
  });

  it("renders a validation error and does not submit on invalid input", async () => {
    const schema = z.object({ name: z.string().min(1) });
    const onSubmit = vi.fn();
    render(
      <FormHarness onSubmit={onSubmit} schema={schema}>
        <SmartField name="name" />
        <button type="submit">submit</button>
      </FormHarness>,
    );
    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => {
      expect(screen.getByTestId("field-error")).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("createFormFormat — SmartFieldArray", () => {
  it("supports append and remove", () => {
    const schema = z.object({
      items: z.array(z.object({ name: z.string() })),
    });
    render(
      <FormHarness onSubmit={vi.fn()} schema={schema}>
        <SmartFieldArray name="items">
          {({ fields, append, remove }) => (
            <>
              {fields.map((f, i) => (
                <div key={f.id}>
                  <SmartField name={`items.${i}.name`} />
                  {/* biome-ignore lint/performance/noJsxPropsBind: test — render perf is irrelevant */}
                  <button onClick={() => remove(i)} type="button">
                    remove-{i}
                  </button>
                </div>
              ))}
              {/* biome-ignore lint/performance/noJsxPropsBind: test — render perf is irrelevant */}
              <button onClick={() => append({ name: "" })} type="button">
                add
              </button>
            </>
          )}
        </SmartFieldArray>
      </FormHarness>,
    );
    expect(screen.queryAllByTestId("field-string")).toHaveLength(0);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryAllByTestId("field-string")).toHaveLength(1);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryAllByTestId("field-string")).toHaveLength(2);
    fireEvent.click(screen.getByText("remove-0"));
    expect(screen.queryAllByTestId("field-string")).toHaveLength(1);
  });
});
