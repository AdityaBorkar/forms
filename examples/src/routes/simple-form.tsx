import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { SmartField } from "@/lib/form";

import { ExampleForm } from "@/components/form-wrapper";

export const Route = createFileRoute("/simple-form")({
  component: SimpleForm,
});

const schema = z.object({
  email: z.email().meta({ label: "Email", placeholder: "ada@example.com" }),
  name: z.string().min(1).meta({ label: "Name", placeholder: "Ada Lovelace" }),
});

function SimpleForm() {
  return (
    <ExampleForm
      description="Two fields rendered straight from a Zod schema — no manual wiring."
      schema={schema}
      title="1 · Simple form"
    >
      <SmartField name="name" />
      <SmartField name="email" />
    </ExampleForm>
  );
}
