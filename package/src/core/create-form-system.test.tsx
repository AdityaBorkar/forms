// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { FieldValues } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";
import z from "zod";

import { zodAdapter } from "#/adapters/zod/index";
import { createFormSystem } from "#/core/create-form-system";
import type { FieldComponentProps } from "#/types";

afterEach(cleanup);

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

const { Form, SmartField, SmartFieldArray, useForm } = createFormSystem({
	fieldComponents: {
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
});
