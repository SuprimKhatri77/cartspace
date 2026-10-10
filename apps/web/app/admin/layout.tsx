import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { site } from "@/lib/site";

// The admin area has its own shell (no storefront header or footer). The
// full panel arrives with the admin phase.
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/admin" className="flex items-baseline gap-3">
            <span className="font-serif text-[1.65rem] leading-none">
              {site.name}
            </span>
            <span className="eyebrow">Admin</span>
          </Link>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[0.8125rem] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to store
          </Link>
        </div>
      </header>
      <main className="container-page flex-1 py-12">{children}</main>
    </div>
  );
}
