import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { SmartField, SmartFieldArray } from "#/components/form-zod";
import { Button } from "#/components/ui/button";

const schema = z.object({
	name: z.string().min(1).meta({ label: "Name" }),
	tags: z
		.array(z.string().min(1).meta({ label: "Tag" }))
		.min(1)
		.max(5)
		.meta({ description: "At least one tag, at most five." }),
});

/**
 * 13 · Primitive array — `z.array(z.string())` carries a primitive
 * `elementDef`, so rows render as `tags.0`, `tags.1`, … directly (no
 * `.title` suffix). Starts empty: the first row only exists after append.
 * (`append` is typed for object rows, so primitives pass through a narrow
 * cast — runtime accepts any row value.)
 */
export function PrimitiveArrayForm() {
	return (
		<ExampleForm
			defaultValues={{ tags: [] }}
			description="Primitive rows append from empty — tags.0, tags.1, … with no object wrapper."
			schema={schema}
			title="13 · Primitive array"
		>
			<SmartField name="name" />
			<SmartFieldArray name="tags">
				{({ append, fields, remove }) => (
					<div className="grid gap-3">
						{fields.map((row, index) => (
							<div className="flex items-end gap-2" key={row.id}>
								<div className="flex-1">
									<SmartField name={`tags.${index}`} />
								</div>
								<Button
									onClick={() => remove(index)}
									type="button"
									variant="destructive"
								>
									Remove
								</Button>
							</div>
						))}
						<Button
							onClick={() => append("" as unknown as Record<string, unknown>)}
							type="button"
							variant="outline"
						>
							Add tag
						</Button>
					</div>
				)}
			</SmartFieldArray>
		</ExampleForm>
	);
}
