import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function FieldShell({
  children,
  description,
  error,
  label,
  name,
  required,
}: {
  children: ReactNode;
  description?: string;
  error?: string;
  label?: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {label ? (
        <Label inputId={name}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
      ) : null}
      {children}
      {description ? (
        <p className="text-muted-foreground text-sm">{description}</p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
