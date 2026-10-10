"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Both icons render; CSS picks one, so SSR and the client agree. */}
      <SunIcon
        weight="light"
        className="hidden size-5 transition-transform duration-500 hover:rotate-45 dark:block"
      />
      <MoonIcon
        weight="light"
        className="size-5 transition-transform duration-500 hover:-rotate-12 dark:hidden"
      />
    </Button>
  );
}
