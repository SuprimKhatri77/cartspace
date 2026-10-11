"use client";

import type { PublicUser } from "@repo/types";
import { MotionProvider } from "@/components/motion/motion-provider";
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
    <ReactQueryProvider>
      <AuthProvider user={user}>
        <MotionProvider>{children}</MotionProvider>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </ReactQueryProvider>
  );
}
