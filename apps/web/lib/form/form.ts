import { createFormHook } from "@tanstack/react-form";
import { fieldContext, formContext } from "./context";
import {
  MoneyField,
  PasswordField,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from "./fields";
import { Form, SubmitButton } from "./form-components";

/**
 * The app's forms: `useAppForm` is TanStack Form's useForm with the field
 * components (`field.TextField`) and form components (`form.Form`,
 * `form.SubmitButton`, inside `form.AppForm`) bound. The pattern:
 *
 *   validationLogic: revalidateLogic(),   // on submit, then every change
 *   validators: { onDynamic: ({ value }) => schemaErrors(Schema, body(value)) },
 *   onSubmit: async ({ value, formApi }) => {
 *     try { await mutation.mutateAsync(...) }
 *     catch (err) { applyApiErrors(formApi, err) }   // API errors onto fields
 *   },
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    TextareaField,
    SelectField,
    MoneyField,
    SwitchField,
  },
  formComponents: { Form, SubmitButton },
});
