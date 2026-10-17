import { expect, test } from "bun:test";
import { pageState } from "@/modules/admin/hooks/use-selection";

test("the header checkbox follows the page's picks", () => {
  const page = ["a", "b", "c"];
  const of = (picked: string[]) => pageState(page, (id) => picked.includes(id));
  expect(of([])).toEqual({ checked: false, indeterminate: false });
  expect(of(["b"])).toEqual({ checked: false, indeterminate: true });
  expect(of(["a", "b", "c"])).toEqual({ checked: true, indeterminate: false });
  // Picks from elsewhere don't count toward this page.
  expect(of(["x"])).toEqual({ checked: false, indeterminate: false });
  expect(pageState([], () => true)).toEqual({
    checked: false,
    indeterminate: false,
  });
});
