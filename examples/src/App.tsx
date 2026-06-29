import { useState } from "react";

import { ArrayForm } from "@/examples/ArrayForm";
import { CustomFieldComponentForm } from "@/examples/CustomFieldComponentForm";
import { CustomFieldTypesForm } from "@/examples/CustomFieldTypesForm";
import { NestedForm } from "@/examples/NestedForm";
import { SimpleForm } from "@/examples/SimpleForm";
import { cn } from "@/lib/utils";

import "./index.css";

const EXAMPLES = [
  { Component: SimpleForm, id: "simple", label: "Simple" },
  { Component: NestedForm, id: "nested", label: "Nested" },
  { Component: ArrayForm, id: "array", label: "Array" },
  { Component: CustomFieldTypesForm, id: "types", label: "Field types" },
  {
    Component: CustomFieldComponentForm,
    id: "custom",
    label: "Custom component",
  },
] as const;

export function App() {
  const [active, setActive] = useState<string>(EXAMPLES[0].id);
  const Current =
    EXAMPLES.find((example) => example.id === active)?.Component ?? SimpleForm;
  return (
    <div className="container mx-auto max-w-3xl p-8">
      <header className="mb-8">
        <h1 className="font-bold text-2xl">@adistack/forms</h1>
        <p className="text-muted-foreground text-sm">
          Schema-driven React forms — Zod schema in, auto-rendered fields out.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                active === example.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
              key={example.id}
              // biome-ignore lint/performance/noJsxPropsBind: demo — render perf is irrelevant
              onClick={() => setActive(example.id)}
              type="button"
            >
              {example.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex justify-center">
        <Current />
      </main>
    </div>
  );
}

// biome-ignore lint/style/useComponentExportOnlyModules: default export for app entrypoint
export default App;
