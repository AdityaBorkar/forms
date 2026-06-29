import z from "zod";

import { Button } from "@/components/ui/button";
import { SmartField, SmartFieldArray } from "@/lib/form";

import { ExampleForm } from "./shared";

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

export function ArrayForm() {
  return (
    <ExampleForm
      defaultValues={{ tasks: [{ hours: 0, title: "" }] }}
      description="Repeatable rows powered by SmartFieldArray — append and remove in place."
      schema={schema}
      title="3 · Array fields"
    >
      <SmartField name="project" />
      <SmartFieldArray name="tasks">
        {({ append, fields, remove }) => (
          <div className="grid gap-3">
            {fields.map((row, index) => (
              <div className="flex items-end gap-2" key={row.id}>
                <div className="flex-1">
                  <SmartField name={`tasks.${index}.title`} />
                </div>
                <div className="w-24">
                  <SmartField name={`tasks.${index}.hours`} />
                </div>
                {/* biome-ignore lint/performance/noJsxPropsBind: demo — render perf is irrelevant */}
                <Button
                  onClick={() => remove(index)}
                  type="button"
                  variant="destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
            {/* biome-ignore lint/performance/noJsxPropsBind: demo — render perf is irrelevant */}
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
