import type { ReactNode } from "react";
import {
  useFieldArray,
  useFormContext as useRhfContext,
} from "react-hook-form";

export type FieldArrayRow = Record<string, unknown> & { id: string };

export type SmartFieldArrayRenderProps = {
  fields: FieldArrayRow[];
  append: (value: Record<string, unknown>) => void;
  remove: (index: number) => void;
  update: (index: number, value: Record<string, unknown>) => void;
  move: (from: number, to: number) => void;
};

export type SmartFieldArrayProps = {
  name: string;
  children: (props: SmartFieldArrayRenderProps) => ReactNode;
};

export function SmartFieldArray({ name, children }: SmartFieldArrayProps) {
  const rhf = useRhfContext();
  if (!rhf) {
    throw new Error("SmartFieldArray must be used within a Form");
  }
  const { fields, append, remove, update, move } = useFieldArray({
    control: rhf.control,
    name,
  });

  return (
    <>
      {children({
        append: append as SmartFieldArrayRenderProps["append"],
        fields: fields as FieldArrayRow[],
        move: move as SmartFieldArrayRenderProps["move"],
        remove,
        update: update as SmartFieldArrayRenderProps["update"],
      })}
    </>
  );
}
