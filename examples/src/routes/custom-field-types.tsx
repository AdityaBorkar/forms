import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { ExampleForm } from "@/components/form-wrapper";
import { SmartField } from "@/lib/form";

export const Route = createFileRoute("/custom-field-types")({
  component: CustomFieldTypesForm,
});

const schema = z.object({
  bio: z.string().max(200).meta({
    label: "Bio",
    placeholder: "Tell us about yourself",
  }),
  password: z.string().min(8).meta({
    description: "At least 8 characters.",
    label: "Password",
  }),
  role: z.enum(["admin", "member", "guest"]).meta({ label: "Role" }),
  subscribe: z.boolean().meta({ label: "Subscribe to newsletter" }),
  username: z
    .string()
    .min(1)
    .meta({ label: "Username", placeholder: "pick a handle" }),
});

function CustomFieldTypesForm() {
  return (
    <ExampleForm
      description="Enum and boolean map automatically. Custom widgets (textarea, password) are handled via the frontend component map."
      schema={schema}
      title="4 · Custom field types"
    >
      <SmartField name="username" />
      <SmartField name="password" />
      <SmartField name="bio" />
      <SmartField name="role" />
      <SmartField name="subscribe" />
    </ExampleForm>
  );
}
