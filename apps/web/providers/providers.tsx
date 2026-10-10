"use client";

import { ThemeProvider } from "next-themes";
import type { PublicUser } from "@repo/types";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "./auth-provider";
import { ReactQueryProvider } from "./react-query-provider";

export function Providers({
  user,
  children,
}: {
  user: PublicUser | null;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReactQueryProvider>
        <AuthProvider user={user}>
          {children}
          <Toaster richColors />
        </AuthProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
