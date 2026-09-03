import z from "zod";

import { ExampleForm } from "#/components/form-wrapper";
import { Button } from "#/components/ui/button";
import { SmartField, SmartFieldArray } from "#/lib/form-zod";

const schema = z.object({
	project: z.string().min(1).meta({ label: "Project name" }),
	tasks: z
		.array(
			z.object({
				hours: z.number().min(0).meta({ label: "Hours" }),
				title: z.string().min(1).meta({ label: "Task title" }),
			}),
		)
		.min(1)
		.meta({ description: "Add at least one task." }),
});

/**
 * 3 · Array fields — `SmartFieldArray` wraps react-hook-form's
 * `useFieldArray` and exposes the full row API: `fields`, `append`,
 * `remove`, `update` and `move`. Rows render plain `SmartField`s with
 * indexed names (`tasks.0.title`).
 */
export function ArrayForm() {
	return (
		<ExampleForm
			defaultValues={{ tasks: [{ hours: 0, title: "" }] }}
			description="Repeatable rows powered by SmartFieldArray — append, update, move and remove in place."
			schema={schema}
			title="3 · Array fields"
		>
			<SmartField name="project" />
			<SmartFieldArray name="tasks">
				{({ append, fields, move, remove, update }) => (
					<div className="grid gap-3">
						{fields.map((row, index) => (
							<div className="flex items-end gap-2" key={row.id}>
								<div className="flex-1">
									<SmartField name={`tasks.${index}.title`} />
								</div>
								<div className="w-24">
									<SmartField name={`tasks.${index}.hours`} />
								</div>
								<div className="flex gap-1">
									<Button
										onClick={() =>
											update(index, {
												hours: 0,
												title: `Task ${index + 1}`,
											})
										}
										type="button"
										variant="outline"
									>
										Reset
									</Button>
									<Button
										disabled={index === 0}
										onClick={() => move(index, index - 1)}
										type="button"
										variant="outline"
									>
										↑
									</Button>
									<Button
										onClick={() => remove(index)}
										type="button"
										variant="destructive"
									>
										Remove
									</Button>
								</div>
							</div>
						))}
						<Button
							onClick={() => append({ hours: 0, title: "" })}
							type="button"
							variant="outline"
						>
							Add task
						</Button>
					</div>
				)}
			</SmartFieldArray>
		</ExampleForm>
	);
}
