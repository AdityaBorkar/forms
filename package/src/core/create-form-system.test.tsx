// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { FieldValues } from "react-hook-form";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import z from "zod";

import type { InferZod } from "#/adapters/zod/index";
import { zodAdapter } from "#/adapters/zod/index";
import { createFormSystem } from "#/core/create-form-system";
import { resetDevWarnings } from "#/errors";
import type { FieldComponentProps, InferFormValues } from "#/types";
import { defineFieldComponent, defineFieldComponents } from "#/types";

afterEach(() => {
	cleanup();
	resetDevWarnings();
});

function makeStub(kind: string) {
	return function StubField({
		name,
		value,
		onChange,
		error,
	}: FieldComponentProps) {
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

const fieldComponents = {
	array: makeStub("array"),
	combobox: makeStub("combobox"),
	email: makeStub("email"),
	number: makeStub("number"),
	object: makeStub("object"),
	string: makeStub("string"),
	unknown: makeStub("unknown"),
};

const { Form, SmartField, SmartFieldArray, useForm } = createFormSystem({
	fieldComponents,
	schemaResolver: zodAdapter,
});

const warnSystem = createFormSystem({
	fieldComponents,
	onMissingField: "warn",
	schemaResolver: zodAdapter,
});

// biome-ignore lint/style/useComponentExportOnlyModules: test harness, not a real export
function FormHarness({
	schema,
	onSubmit,
	defaultValues,
	children,
}: {
	schema: z.ZodType<FieldValues, FieldValues>;
	onSubmit: (values: Record<string, unknown>) => void;
	defaultValues?: Record<string, unknown>;
	children: React.ReactNode;
}) {
	const form = useForm({ defaultValues, onSubmit, schema });
	return <Form form={form}>{children}</Form>;
}

// biome-ignore lint/style/useComponentExportOnlyModules: test harness, not a real export
function WarnHarness({
	schema,
	onSubmit,
	defaultValues,
	children,
}: {
	schema: z.ZodType<FieldValues, FieldValues>;
	onSubmit: (values: Record<string, unknown>) => void;
	defaultValues?: Record<string, unknown>;
	children: React.ReactNode;
}) {
	const form = warnSystem.useForm({ defaultValues, onSubmit, schema });
	return <warnSystem.Form form={form}>{children}</warnSystem.Form>;
}

describe("createFormSystem — component resolution", () => {
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

	it("SmartField honors meta.component overrides", () => {
		const schema = z.object({
			bio: z.string().meta({ component: "combobox" }),
		});
		render(
			<FormHarness onSubmit={vi.fn()} schema={schema}>
				<SmartField name="bio" />
			</FormHarness>,
		);
		expect(screen.getByTestId("field-combobox")).toBeTruthy();
	});

	it("throws in dev for an unknown field name", () => {
		const schema = z.object({ name: z.string() });
		expect(() =>
			render(
				<FormHarness onSubmit={vi.fn()} schema={schema}>
					<SmartField name="missing" />
				</FormHarness>,
			),
		).toThrow('No field definition found for "missing"');
	});

	it("renders nothing (warn) for an unknown field name with onMissingField: warn", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			const schema = z.object({ name: z.string() });
			render(
				<WarnHarness onSubmit={vi.fn()} schema={schema}>
					<warnSystem.SmartField name="missing" />
				</WarnHarness>,
			);
			expect(screen.queryByTestId("field-string")).toBeNull();
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	it("throws in dev for a field kind with no registered component", () => {
		const schema = z.object({ when: z.date() });
		expect(() =>
			render(
				<FormHarness onSubmit={vi.fn()} schema={schema}>
					<SmartField name="when" />
				</FormHarness>,
			),
		).toThrow('No component registered for field kind "date"');
	});

	it("renders nothing (warn) for a missing kind with onMissingField: warn", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			const schema = z.object({ when: z.date() });
			render(
				<WarnHarness onSubmit={vi.fn()} schema={schema}>
					<warnSystem.SmartField name="when" />
				</WarnHarness>,
			);
			expect(screen.queryByTestId("field-string")).toBeNull();
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});

describe("createFormSystem — nested paths", () => {
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

	it("SmartField resolves a primitive array element path", () => {
		const schema = z.object({ tags: z.array(z.string()) });
		render(
			<FormHarness
				defaultValues={{ tags: ["hello"] }}
				onSubmit={vi.fn()}
				schema={schema}
			>
				<SmartFieldArray name="tags">
					{({ fields }) => (
						<>
							{fields.map((f, i) => (
								<SmartField key={f.id} name={`tags.${i}`} />
							))}
						</>
					)}
				</SmartFieldArray>
			</FormHarness>,
		);
		expect(screen.getByTestId("field-string")).toBeTruthy();
	});
});

describe("createFormSystem — submission & validation", () => {
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

	it("supports async onSubmit handlers", async () => {
		const schema = z.object({ name: z.string().min(1) });
		const onSubmit = vi.fn(async (_values: Record<string, unknown>) => {});
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
});

describe("createFormSystem — SmartFieldArray", () => {
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

	it("appendDefault derives a row from the schema without shape duplication", () => {
		const schema = z.object({
			tasks: z.array(
				z.object({
					done: z.boolean(),
					title: z.string().min(1),
				}),
			),
		});
		let appendDefaultRef!: (overrides?: Record<string, unknown>) => void;
		render(
			<FormHarness onSubmit={vi.fn()} schema={schema}>
				<SmartFieldArray name="tasks">
					{({ appendDefault, fields }) => {
						appendDefaultRef = appendDefault;
						return (
							<>
								{fields.map((f, i) => (
									<SmartField key={f.id} name={`tasks.${i}.title`} />
								))}
								{/* biome-ignore lint/performance/noJsxPropsBind: test — render perf is irrelevant */}
								<button onClick={() => appendDefault()} type="button">
									add-default
								</button>
							</>
						);
					}}
				</SmartFieldArray>
			</FormHarness>,
		);
		expect(screen.queryAllByTestId("field-string")).toHaveLength(0);
		fireEvent.click(screen.getByText("add-default"));
		expect(screen.queryAllByTestId("field-string")).toHaveLength(1);
		expect((screen.getByTestId("field-string") as HTMLInputElement).value).toBe(
			"",
		);
		act(() => {
			appendDefaultRef({ title: "Named" });
		});
		expect(screen.queryAllByTestId("field-string")).toHaveLength(2);
		const inputs = screen.getAllByTestId("field-string") as Array<
			HTMLInputElement & { value: string }
		>;
		expect(inputs[1]?.value).toBe("Named");
	});

	it("appendDefault derives a primitive element default", () => {
		const schema = z.object({ tags: z.array(z.string()) });
		render(
			<FormHarness onSubmit={vi.fn()} schema={schema}>
				<SmartFieldArray name="tags">
					{({ appendDefault, fields }) => (
						<>
							{fields.map((f, i) => (
								<SmartField key={f.id} name={`tags.${i}`} />
							))}
							{/* biome-ignore lint/performance/noJsxPropsBind: test — render perf is irrelevant */}
							<button onClick={() => appendDefault()} type="button">
								add-tag
							</button>
						</>
					)}
				</SmartFieldArray>
			</FormHarness>,
		);
		fireEvent.click(screen.getByText("add-tag"));
		expect(screen.getByTestId("field-string")).toBeTruthy();
	});

	it("appendDefault throws for a non-array field", () => {
		const schema = z.object({ name: z.string() });
		let appendDefault!: (overrides?: Record<string, unknown>) => void;
		render(
			<FormHarness onSubmit={vi.fn()} schema={schema}>
				<SmartFieldArray name="name">
					{(props) => {
						appendDefault = props.appendDefault;
						return null;
					}}
				</SmartFieldArray>
			</FormHarness>,
		);
		expect(() => appendDefault()).toThrow(
			'appendDefault can only be used with array fields (field "name" is kind "string")',
		);
	});
});

describe("form-system — typed helpers (zero runtime)", () => {
	it("defineFieldComponent returns the component unchanged", () => {
		function NumberInput(props: FieldComponentProps<number>) {
			return <input readOnly value={props.value ?? 0} />;
		}
		expect(defineFieldComponent<number>(NumberInput)).toBe(NumberInput);
	});

	it("defineFieldComponents returns the map unchanged", () => {
		function StringInput(props: FieldComponentProps<string>) {
			return <input readOnly value={props.value ?? ""} />;
		}
		const map = defineFieldComponents({ string: StringInput });
		expect(map.string).toBe(StringInput);
	});

	it("InferFormValues resolves Standard Schema output", () => {
		const schema = z.object({ age: z.number(), name: z.string() });
		expectTypeOf<InferFormValues<typeof schema>>().toEqualTypeOf<{
			age: number;
			name: string;
		}>();
	});

	it("InferZod matches z.infer", () => {
		const schema = z.object({ name: z.string() });
		expectTypeOf<InferZod<typeof schema>>().toEqualTypeOf<
			z.infer<typeof schema>
		>();
	});
});
