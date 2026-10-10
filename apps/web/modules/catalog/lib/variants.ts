import type { StorefrontVariant } from "@repo/types";

export type OptionGroup = { name: string; values: string[] };

/** Option names in first-seen order, each with its distinct values. */
export function optionGroups(variants: StorefrontVariant[]): OptionGroup[] {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    for (const { name, value } of variant.options) {
      const values = groups.get(name) ?? [];
      if (!values.includes(value)) values.push(value);
      groups.set(name, values);
    }
  }
  return [...groups].map(([name, values]) => ({ name, values }));
}

export type Selection = Record<string, string>;

export function selectionOf(variant: StorefrontVariant): Selection {
  return Object.fromEntries(variant.options.map((o) => [o.name, o.value]));
}

/** The variant whose options are exactly selection, if any. */
export function findVariant(
  variants: StorefrontVariant[],
  selection: Selection,
): StorefrontVariant | undefined {
  return variants.find(
    (v) =>
      v.options.length === Object.keys(selection).length &&
      v.options.every((o) => selection[o.name] === o.value),
  );
}

/**
 * Picking value for option name: the variant with that value that keeps as
 * many of the other current choices as possible, so switching size keeps
 * the colour when that combination exists.
 */
export function pickOption(
  variants: StorefrontVariant[],
  selection: Selection,
  name: string,
  value: string,
): StorefrontVariant | undefined {
  let best: StorefrontVariant | undefined;
  let bestScore = -1;
  for (const variant of variants) {
    const options = selectionOf(variant);
    if (options[name] !== value) continue;
    const score = Object.entries(selection).filter(
      ([n, v]) => n !== name && options[n] === v,
    ).length;
    if (score > bestScore) {
      best = variant;
      bestScore = score;
    }
  }
  return best;
}

/** Whether value of option name exists alongside the other current choices. */
export function isAvailable(
  variants: StorefrontVariant[],
  selection: Selection,
  name: string,
  value: string,
): boolean {
  return variants.some((variant) => {
    const options = selectionOf(variant);
    return (
      options[name] === value &&
      Object.entries(selection).every(
        ([n, v]) => n === name || options[n] === v,
      )
    );
  });
}
