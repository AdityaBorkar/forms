import { zodAdapter } from "@adityab/forms/adapters/zod";
import { createFormFormat, type FieldComponentMap } from "@adityab/forms/core";

import {
  CheckboxField,
  NumberField,
  SelectField,
  SliderField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/fields";

const fieldComponents: FieldComponentMap = {
  boolean: CheckboxField,
  checkbox: CheckboxField,
  email: TextField,
  enum: SelectField,
  number: NumberField,
  password: TextField,
  slider: SliderField,
  string: TextField,
  switch: SwitchField,
  textarea: TextareaField,
  unknown: TextField,
  url: TextField,
};

export const { Form, SmartField, SmartFieldArray, useForm } = createFormFormat({
  fieldMap: fieldComponents,
  schemaResolver: zodAdapter,
});
