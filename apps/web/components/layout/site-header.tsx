import Link from "next/link";
import { CategoryNav } from "./category-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header>
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            cartspace
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
      <CategoryNav />
    </header>
  );
}
