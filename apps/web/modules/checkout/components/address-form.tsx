"use client";

import { SHIPPING_COUNTRIES, type Country } from "@repo/types";
import { FieldGroup } from "@/components/ui/field";
import { withForm } from "@/lib/form/form";
import { COUNTRY_NAMES } from "../lib/countries";

export type AddressValues = {
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: Country;
};

export const EMPTY_ADDRESS: AddressValues = {
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "US",
};

const countryItems = SHIPPING_COUNTRIES.map((code) => ({
  value: code,
  label: COUNTRY_NAMES[code],
}));

/** Field labels for the plain-words messages ("Enter a city"). */
export const ADDRESS_LABELS = {
  full_name: "your full name",
  phone: "a phone number",
  line1: "your street address",
  city: "a city",
  postal_code: "a postal code",
  country: "a country",
};

/** The shipping address fields, inside a form whose values are an address. */
export const AddressFields = withForm({
  defaultValues: EMPTY_ADDRESS,
  render: function Render({ form }) {
    return (
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <form.AppField name="full_name">
          {(field) => (
            <field.TextField
              id="address-full_name"
              label="Full name"
              autoComplete="shipping name"
              fieldClassName="sm:col-span-2"
            />
          )}
        </form.AppField>
        <form.AppField name="line1">
          {(field) => (
            <field.TextField
              id="address-line1"
              label="Address"
              autoComplete="shipping address-line1"
              fieldClassName="sm:col-span-2"
            />
          )}
        </form.AppField>
        <form.AppField name="line2">
          {(field) => (
            <field.TextField
              id="address-line2"
              label="Apartment, suite"
              optional
              autoComplete="shipping address-line2"
              fieldClassName="sm:col-span-2"
            />
          )}
        </form.AppField>
        <form.AppField name="city">
          {(field) => (
            <field.TextField
              id="address-city"
              label="City"
              autoComplete="shipping address-level2"
            />
          )}
        </form.AppField>
        <form.AppField name="region">
          {(field) => (
            <field.TextField
              id="address-region"
              label="State / region"
              optional
              autoComplete="shipping address-level1"
            />
          )}
        </form.AppField>
        <form.AppField name="postal_code">
          {(field) => (
            <field.TextField
              id="address-postal_code"
              label="Postal code"
              autoComplete="shipping postal-code"
            />
          )}
        </form.AppField>
        <form.AppField name="country">
          {(field) => (
            <field.SelectField
              id="address-country"
              label="Country"
              items={countryItems}
            />
          )}
        </form.AppField>
        <form.AppField name="phone">
          {(field) => (
            <field.TextField
              id="address-phone"
              label="Phone"
              type="tel"
              autoComplete="shipping tel"
              fieldClassName="sm:col-span-2"
            />
          )}
        </form.AppField>
      </FieldGroup>
    );
  },
});
