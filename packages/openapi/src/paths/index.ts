import { registerAuthPaths } from "./auth.ts";
import { registerCartPaths } from "./carts.ts";
import { registerCategoryPaths } from "./categories.ts";
import { registerHealthPaths } from "./health.ts";
import { registerProductPaths } from "./products.ts";
import { registerVariantPaths } from "./variants.ts";

export function registerPaths() {
  registerHealthPaths();
  registerAuthPaths();
  registerCategoryPaths();
  registerProductPaths();
  registerVariantPaths();
  registerCartPaths();
}
