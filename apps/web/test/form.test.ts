import { describe, expect, test } from "bun:test";
import { AxiosError, type AxiosResponse } from "axios";
import { FieldApi, FormApi, revalidateLogic } from "@tanstack/react-form";
import {
  AddressInputSchema,
  LoginBodySchema,
  RegisterBodySchema,
  ReviewBodySchema,
} from "@repo/types";
import {
  applyApiErrors,
  clearServerError,
  clearServerErrors,
} from "@/lib/form/api-errors";
import { fieldName, firstError, schemaErrors } from "@/lib/form/validate";

describe("fieldName", () => {
  test("writes array entries in brackets", () => {
    expect(fieldName("email")).toBe("email");
    expect(fieldName("features.1")).toBe("features[1]");
    expect(fieldName(["properties", 0, "name"])).toBe("properties[0].name");
    expect(fieldName("address.city")).toBe("address.city");
    expect(fieldName([])).toBe("");
  });
});

describe("schemaErrors", () => {
  test("names what is missing, with labels", () => {
    expect(
      schemaErrors(
        ReviewBodySchema,
        { rating: 0, title: " ", body: "" },
        { labels: { rating: "a rating", title: "a title" } },
      ),
    ).toEqual({
      fields: {
        rating: "Choose a rating",
        title: "Enter a title",
        body: "Enter a value",
      },
    });
  });

  test("lengths and choices", () => {
    const errors = schemaErrors(
      AddressInputSchema,
      {
        full_name: "x".repeat(81),
        phone: "123",
        line1: "1 Main",
        city: "X",
        postal_code: "1",
        country: "ZZ",
      },
      { labels: { country: "a country" } },
    );
    expect(errors?.fields).toEqual({
      full_name: "Use at most 80 characters",
      phone: "Use at least 6 characters",
      country: "Choose a country",
    });
  });

  test("keeps the schema's own wording without labels", () => {
    const errors = schemaErrors(LoginBodySchema, { email: "x", password: "" });
    expect(Object.keys(errors?.fields ?? {})).toEqual(["email", "password"]);
    expect(errors?.fields.email).toBe(
      LoginBodySchema.safeParse({ email: "x", password: "pw" }).error?.issues[0]
        ?.message,
    );
  });

  test("renames body paths onto form rows", () => {
    // The body dropped a blank row 0, so its row 0 is the form's row 1.
    const errors = schemaErrors(
      ReviewBodySchema.pick({ title: true }).extend({}).array(),
      [{ title: "" }],
      { rename: (name) => name.replace(/^\[0\]/, "features[1]") },
    );
    expect(Object.keys(errors?.fields ?? {})).toEqual(["features[1].title"]);
  });

  test("is undefined once the body parses", () => {
    expect(
      schemaErrors(LoginBodySchema, { email: "a@example.org", password: "pw" }),
    ).toBeUndefined();
  });
});

test("firstError skips empty entries", () => {
  expect(firstError([undefined, "", "Enter a name", "other"])).toBe(
    "Enter a name",
  );
  expect(firstError([])).toBeUndefined();
});

describe("register name", () => {
  const valid = (name: string) =>
    RegisterBodySchema.safeParse({
      name,
      email: "a@example.org",
      password: "long-enough",
    }).success;

  test("accepts real names, like the API's personname rule", () => {
    for (const name of [
      "Ada Lovelace",
      "José Álvarez",
      "O'Brien",
      "O’Brien",
      "Mary-Jane",
      "J. R. Tolkien",
      "Nguyễn Văn An",
      "सुप्रिम खत्री",
      "李小龙",
    ]) {
      expect(valid(name)).toBe(true);
    }
    for (const name of ["-Ann", "Ann2", "Ann_Lee", "Ann\tLee", "<b>"]) {
      expect(valid(name)).toBe(false);
    }
  });
});

function apiError(data: unknown): AxiosError {
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, null, {
    data,
    status: 400,
  } as AxiosResponse);
}

/** A mounted form with the given fields, as a component would have it. */
function mountedForm(values: Record<string, string>) {
  const form = new FormApi({
    defaultValues: values,
    validationLogic: revalidateLogic(),
    onSubmitMeta: {},
  });
  form.mount();
  const fields = Object.fromEntries(
    Object.keys(values).map((name) => {
      const field = new FieldApi({ form, name });
      field.mount();
      return [name, field];
    }),
  );
  return { form, fields };
}

describe("applyApiErrors", () => {
  const refusal = apiError({
    success: false,
    message: "Invalid request body",
    code: "VALIDATION_FAILED",
    errors: [
      {
        field: "address.city",
        code: "REQUIRED_FIELD",
        message: "Enter a city",
      },
      { field: "email", code: "INVALID_VALUE", message: "Already taken" },
    ],
  });

  test("puts field errors on fields, until cleared", () => {
    const { form, fields } = mountedForm({ email: "", city: "" });
    const result = applyApiErrors(form, refusal, {
      rename: (name) => name.replace(/^address\./, ""),
    });
    expect(result).toEqual({ applied: true, message: undefined });
    expect(firstError(fields.email!.state.meta.errors)).toBe("Already taken");
    expect(firstError(fields.city!.state.meta.errors)).toBe("Enter a city");

    clearServerError(fields.email!);
    expect(fields.email!.state.meta.errors).toEqual([]);
    expect(firstError(fields.city!.state.meta.errors)).toBe("Enter a city");

    clearServerErrors(form);
    expect(fields.city!.state.meta.errors).toEqual([]);
  });

  test("a code can name the field", () => {
    const { form, fields } = mountedForm({ name: "" });
    const result = applyApiErrors(
      form,
      apiError({
        success: false,
        message: "Category exists",
        code: "CATEGORY_ALREADY_EXISTS",
      }),
      {
        codes: {
          CATEGORY_ALREADY_EXISTS: {
            field: "name",
            message: "Another category already has this name",
          },
        },
      },
    );
    expect(result.applied).toBe(true);
    expect(firstError(fields.name!.state.meta.errors)).toBe(
      "Another category already has this name",
    );
  });

  test("errors for fields not on screen are left for a toast", () => {
    const { form } = mountedForm({ name: "" });
    expect(applyApiErrors(form, refusal)).toEqual({
      applied: false,
      message: "Invalid request body",
    });
  });

  test("a network failure applies nothing and has no message", () => {
    const { form } = mountedForm({ name: "" });
    expect(applyApiErrors(form, new AxiosError("Network Error"))).toEqual({
      applied: false,
      message: undefined,
    });
    expect(applyApiErrors(form, new Error("boom")).applied).toBe(false);
  });
});

describe("validation timing", () => {
  test("submit first, then every change", async () => {
    const form = new FormApi({
      defaultValues: { email: "", password: "" },
      validationLogic: revalidateLogic(),
      validators: {
        onDynamic: ({ value }) => schemaErrors(LoginBodySchema, value),
      },
    });
    form.mount();
    const email = new FieldApi({ form, name: "email" });
    email.mount();
    new FieldApi({ form, name: "password" }).mount();

    email.handleChange("x");
    expect(email.state.meta.errors).toEqual([]);

    await form.handleSubmit();
    expect(firstError(email.state.meta.errors)).toBeDefined();

    email.handleChange("a@example.org");
    expect(email.state.meta.errors).toEqual([]);
  });
});
