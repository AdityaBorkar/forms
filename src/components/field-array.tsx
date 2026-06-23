import type { UseFieldArrayReturn } from "react-hook-form";
import { useFieldArray, useFormContext } from "react-hook-form";

import type { FieldMap, FieldMeta } from "../hooks/use-form";
import { deriveDefault } from "../hooks/use-form";

type FieldArrayConfig = {
  addLabel?: string;
  maxItems?: number;
  renderRow?: (props: {
    fields: Record<string, any>;
    index: number;
    remove: () => void;
  }) => React.ReactNode;
};

type FieldArrayRenderProps = {
  fields: UseFieldArrayReturn["fields"];
  append: (defaults: Record<string, unknown>) => void;
  remove: (index: number) => void;
  addLabel: string;
  maxItems: number | undefined;
  disabled: boolean | undefined;
  canAdd: boolean;
  elementFields: FieldMap | undefined;
  register: ReturnType<typeof useFormContext>["register"];
  name: string;
};

type FieldArrayProps = {
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  elementFields: FieldMap | undefined;
  config: FieldArrayConfig | undefined;
  control: any;
  name: string;
  children: (props: FieldArrayRenderProps) => React.ReactNode;
};

function FieldArray({
  meta,
  disabled,
  elementFields,
  config,
  control,
  name,
  children,
}: FieldArrayProps) {
  const { register } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  const addLabel = config?.addLabel ?? `Add ${meta?.label ?? "item"}`;
  const maxItems = config?.maxItems;
  const canAdd = !disabled && (!maxItems || fields.length < maxItems);

  function handleAppend() {
    if (!canAdd) return;
    const defaults: Record<string, unknown> = {};
    if (elementFields) {
      for (const [key, def] of Object.entries(elementFields)) {
        defaults[key] = deriveDefault(def);
      }
    }
    append(defaults);
  }

  return children({
    addLabel,
    append: handleAppend,
    canAdd,
    disabled,
    elementFields,
    fields,
    maxItems,
    name,
    register,
    remove,
  });
}

export type { FieldArrayConfig, FieldArrayRenderProps };
export { FieldArray };
