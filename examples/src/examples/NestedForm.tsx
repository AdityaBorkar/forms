import z from "zod";

import { SmartField } from "@/lib/form";

import { ExampleForm } from "./shared";

const schema = z.object({
  address: z.object({
    city: z.string().min(1).meta({ label: "City" }),
    street: z.string().min(1).meta({ label: "Street" }),
    zip: z.string().min(1).meta({ label: "ZIP code" }),
  }),
  name: z.string().min(1).meta({ label: "Full name" }),
});

export function NestedForm() {
  return (
    <ExampleForm
      description="Nested objects resolve via dotted field names — address.street, address.city…"
      schema={schema}
      title="2 · Nested fields"
    >
      <SmartField name="name" />
      <SmartField name="address.street" />
      <SmartField name="address.city" />
      <SmartField name="address.zip" />
    </ExampleForm>
  );
}
