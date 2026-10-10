import { site } from "@/lib/site";

/** A slow ticker of store notices; static for reduced-motion users. */
export function AnnouncementBar() {
  // Two copies side by side make the -50% marquee loop seamless.
  const items = [...site.announcement, ...site.announcement];
  return (
    <div className="overflow-hidden bg-primary text-primary-foreground">
      <p className="sr-only">{site.announcement.join(". ")}</p>
      <div aria-hidden className="animate-marquee flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0">
            {items.map((text, i) => (
              <li
                key={`${copy}-${i}`}
                className="flex h-9 items-center px-8 font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
              >
                {text}
                <span className="ml-16 opacity-40">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
