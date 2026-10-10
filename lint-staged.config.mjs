/** @type {import("lint-staged").Configuration} */
export default {
  "apps/web/**/*.{js,jsx,ts,tsx,mjs,cjs}": (filenames) => [
    `bunx eslint --fix --max-warnings=0 -c apps/web/eslint.config.js ${filenames.join(" ")}`,
    `bunx prettier --write ${filenames.join(" ")}`,
  ],
  "packages/ui/**/*.{js,jsx,ts,tsx,mjs,cjs}": (filenames) => [
    `bunx eslint --fix --max-warnings=0 -c packages/ui/eslint.config.mjs ${filenames.join(" ")}`,
    `bunx prettier --write ${filenames.join(" ")}`,
  ],
  // Keep sqlc Go output in sync when queries/schema change.
  "apps/api/{sqlc.yml,internal/database/queries/**/*.sql,internal/database/schema/**/*.sql,migrations/**/*.sql}":
    () => ["bun run db:sqlc", "git add apps/api/internal/database/generated"],
  "*.{js,jsx,ts,tsx,mjs,cjs,json,yml,yaml,css}": ["bunx prettier --write"],
  "*.go": ["gofmt -w"],
};
