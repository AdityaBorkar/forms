import z from "zod";

import { SmartField } from "@/lib/form";

import { ExampleForm } from "./shared";

const schema = z.object({
  notifications: z
    .boolean()
    .meta({ component: "switch", label: "Email notifications" }),
  rating: z.number().min(0).max(10).meta({
    component: "slider",
    description: "Rate it 0–10.",
    label: "Rating",
  }),
  title: z.string().min(1).meta({ label: "Title" }),
});

export function CustomFieldComponentForm() {
  return (
    <ExampleForm
      defaultValues={{ notifications: false, rating: 0 }}
      description="Register your own components in the field map — a Radix Switch and Slider wired to boolean/number kinds."
      schema={schema}
      title="5 · Custom field component"
    >
      <SmartField name="title" />
      <SmartField name="rating" />
      <SmartField name="notifications" />
    </ExampleForm>
  );
}
