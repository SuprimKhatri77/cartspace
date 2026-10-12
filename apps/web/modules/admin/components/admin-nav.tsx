"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatCircleTextIcon,
  GearSixIcon,
  PackageIcon,
  ReceiptIcon,
  SignOutIcon,
  SquaresFourIcon,
  TreeStructureIcon,
  UsersIcon,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/modules/auth/hooks/mutations/use-logout";
import { useAuth } from "@/providers/auth-provider";

const links: { label: string; href: string; icon: Icon }[] = [
  { label: "Dashboard", href: "/admin", icon: SquaresFourIcon },
  { label: "Orders", href: "/admin/orders", icon: ReceiptIcon },
  { label: "Customers", href: "/admin/customers", icon: UsersIcon },
  { label: "Products", href: "/admin/products", icon: PackageIcon },
  { label: "Categories", href: "/admin/categories", icon: TreeStructureIcon },
  { label: "Reviews", href: "/admin/reviews", icon: ChatCircleTextIcon },
  { label: "Settings", href: "/admin/settings", icon: GearSixIcon },
];

function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** The admin sections, for the sidebar and the mobile sheet. */
export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {links.map(({ label, href, icon: LinkIcon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isCurrent(pathname, href) ? "page" : undefined}
          className={cn(
            "flex h-10 items-center gap-3 border-l-2 border-transparent px-4 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
            "aria-[current=page]:border-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground",
          )}
        >
          <LinkIcon className="size-4" weight="light" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Who is signed in, with a way out. */
export function AdminAccount() {
  const user = useAuth((s) => s.user);
  const logout = useLogout();
  if (!user) return null;
  return (
    <div className="space-y-3 px-4">
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem]">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <SignOutIcon className="size-3.5" />
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
