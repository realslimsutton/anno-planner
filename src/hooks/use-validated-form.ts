import type { FieldValues, UseFormProps } from "react-hook-form";
import type { $ZodType } from "zod/v4/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export type ValidatedFormProps<Input extends FieldValues, Output> = {
  schema: $ZodType<Output, Input>;
} & Exclude<UseFormProps<Input, unknown, Output>, "resolver">;

export function useValidatedForm<Input extends FieldValues, Output>({
  schema,
  ...props
}: ValidatedFormProps<Input, Output>) {
  return useForm({
    resolver: zodResolver(schema),
    ...props,
  });
}
