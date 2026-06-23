import type { ControllerRenderProps } from "react-hook-form";

import type { FieldMeta } from "../hooks/use-form";

type ComboboxOption = Record<string, any>;

type ComboboxConfig<TOption extends ComboboxOption = ComboboxOption> = {
  options?: TOption[];
  getOptionLabel?: (option: TOption) => string;
  getOptionValue?: (option: TOption) => string | number;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

type ComboboxFieldRenderProps = {
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  disabled: boolean | undefined;
  placeholder: string | undefined;
  options: ComboboxOption[];
  getOptionLabel: (option: ComboboxOption) => string;
  getOptionValue: (option: ComboboxOption) => string | number;
  searchPlaceholder: string;
  emptyMessage: string;
  selectedOption: ComboboxOption | undefined;
  filteredOptions: ComboboxOption[];
};

type ComboboxFieldProps = {
  field: ControllerRenderProps;
  meta: FieldMeta | undefined;
  disabled: boolean | undefined;
  config: ComboboxConfig<any> | undefined;
  children: (props: ComboboxFieldRenderProps) => React.ReactNode;
};

function defaultGetOptionLabel(o: ComboboxOption): string {
  return o.label ?? o.name ?? "";
}

function defaultGetOptionValue(o: ComboboxOption): string | number {
  return o.value ?? o.id;
}

function ComboboxField({
  field,
  meta,
  disabled,
  config,
  children,
}: ComboboxFieldProps) {
  const options = config?.options ?? [];
  const getLabel = config?.getOptionLabel ?? defaultGetOptionLabel;
  const getValue = config?.getOptionValue ?? defaultGetOptionValue;
  const searchPlaceholder = config?.searchPlaceholder ?? "Search...";
  const emptyMessage = config?.emptyMessage ?? "No items found";

  const selected = options.find(
    (o) => String(getValue(o)) === String(field.value),
  );

  return children({
    disabled,
    emptyMessage,
    filteredOptions: options,
    getOptionLabel: getLabel,
    getOptionValue: getValue,
    onChange: (value: string | number) => field.onChange(value),
    options,
    placeholder: meta?.placeholder,
    searchPlaceholder,
    selectedOption: selected,
    value: field.value,
  });
}

export type { ComboboxConfig, ComboboxFieldRenderProps, ComboboxOption };
export { ComboboxField };
