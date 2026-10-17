import type { ReactNode } from "react";
import Link from "next/link";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { LEGAL_PAGES, LEGAL_UPDATED } from "../lib/pages";

export type LegalSection = { id: string; title: string; body: ReactNode };

const updated = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(LEGAL_UPDATED));

/**
 * A policy page: the title, a demo-store notice, then numbered sections with
 * a sticky contents list beside them on wide screens.
 */
export function LegalPage({
  path,
  eyebrow,
  title,
  intro,
  sections,
}: {
  path: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="container-page pt-10 pb-8 lg:pt-16">
      <header className="max-w-3xl space-y-5">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1 className="display animate-rise text-5xl [--i:1] sm:text-6xl">
          {title}
        </h1>
        <p className="animate-rise max-w-2xl text-base leading-relaxed text-muted-foreground [--i:2]">
          {intro}
        </p>
        <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
          Last updated <time dateTime={LEGAL_UPDATED}>{updated}</time>
        </p>
      </header>

      <p className="mt-10 max-w-3xl rounded-panel border border-border bg-secondary/50 px-5 py-4 text-[0.8125rem] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          {site.name} is a demo store.
        </span>{" "}
        No real orders are fulfilled and payments run in Stripe’s test mode.
        These pages describe how the store works; they are not legal advice.
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            <div>
              <p className="eyebrow mb-3">On this page</p>
              <ol className="space-y-2 text-[0.8125rem]">
                {sections.map((s, i) => (
                  <li key={s.id} className="flex gap-2.5">
                    <span className="font-mono text-[0.625rem] leading-5 text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={`#${s.id}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </nav>

        <article className="max-w-2xl space-y-12">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="flex items-baseline gap-3 font-serif text-2xl sm:text-3xl">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-medium [&_strong]:text-foreground">
                {s.body}
              </div>
            </section>
          ))}

          <section className="border-t border-border pt-8 text-[0.9375rem] leading-relaxed text-muted-foreground">
            Questions? Write to{" "}
            <a
              href={`mailto:${site.contactEmail}`}
              className="text-foreground underline underline-offset-4"
            >
              {site.contactEmail}
            </a>
            .
          </section>
        </article>
      </div>

      <nav
        aria-label="Policies"
        className="mt-20 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-8"
      >
        {LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            aria-current={page.href === path ? "page" : undefined}
            className={cn(
              "text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground",
              "aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:underline-offset-4",
            )}
          >
            {page.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** A bulleted list in a policy section. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden
            className="mt-[0.7em] h-px w-3 shrink-0 bg-foreground/40"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
