"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserIcon } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loginPath } from "@/lib/auth/redirect";
import { useLogout } from "@/modules/auth/hooks/mutations/use-logout";
import { useAuth } from "@/providers/auth-provider";

export function UserMenu() {
  const user = useAuth((s) => s.user);
  const pathname = usePathname();
  const logout = useLogout();

  if (!user) {
    return (
      <Link
        className={buttonVariants({
          variant: "ghost",
          className: "gap-2 px-2.5",
        })}
        href={loginPath(pathname)}
      >
        <UserIcon className="size-5" weight="light" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Account menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-[0.625rem] tracking-wider text-primary-foreground">
          {initials}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 px-2 py-2">
            <span className="block truncate text-sm text-foreground">
              {user.name}
            </span>
            <span className="block truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account" />}>
          Account
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            Admin
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
