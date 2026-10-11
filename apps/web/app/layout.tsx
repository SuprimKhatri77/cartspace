import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Geist,
  Geist_Mono,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/auth/session";
import { Providers } from "@/providers/providers";
import { currentTheme } from "@/lib/theme-server";
import { themeById, themePickerEnabled } from "@/lib/themes";
import { ThemePicker } from "@/components/theme/theme-picker";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
// Botanical's headline face. Not preloaded: only pages in that theme use it,
// so other themes never download it.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: `${site.name}: ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
};

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: themeById(await currentTheme()).themeColor };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, theme] = await Promise.all([getSessionUser(), currentTheme()]);
  const picker = themePickerEnabled();

  return (
    <html
      lang="en"
      data-theme={theme}
      className={cn(
        "h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        instrumentSerif.variable,
        fraunces.variable,
      )}
    >
      {/* Children never shrink: a scroll lock (dialogs, menus) can pin the
          body to the viewport height, and shrinking would collapse the
          overflow-hidden announcement bar. */}
      <body className="flex min-h-full flex-col *:shrink-0">
        <Providers user={user}>
          {children}
          {picker && <ThemePicker initial={theme} />}
        </Providers>
      </body>
    </html>
  );
}
