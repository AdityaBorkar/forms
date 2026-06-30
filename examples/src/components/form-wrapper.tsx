import { type ReactNode, useState } from "react";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, useForm } from "@/lib/form";

export function ExampleForm({
  children,
  defaultValues,
  description,
  schema,
  title,
}: {
  children: ReactNode;
  defaultValues?: Record<string, unknown>;
  description: string;
  schema: ZodType;
  title: string;
}) {
  const [result, setResult] = useState<unknown>(null);
  const form = useForm({
    defaultValues,
    onSubmit: (values) => setResult(values),
    schema,
  });
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form className="grid gap-4" form={form}>
          {children}
          <Button type="submit">Submit</Button>
        </Form>
        {result !== null ? (
          <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
