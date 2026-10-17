import { z } from "zod";

// Zod compiles object parsers with new Function() unless jitless; under the
// web's CSP (no 'unsafe-eval') that probe is refused and reported on every
// page. Imported first by index.ts, before any schema is built.
z.config({ jitless: true });

export { z };
