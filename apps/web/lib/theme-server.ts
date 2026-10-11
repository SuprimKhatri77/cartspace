import { cookies } from "next/headers";
import {
  resolveTheme,
  THEME_COOKIE,
  themePickerEnabled,
  type ThemeId,
} from "./themes";

/** The theme this request renders with (see resolveTheme). */
export async function currentTheme(): Promise<ThemeId> {
  const cookieStore = await cookies();
  return resolveTheme({
    cookie: cookieStore.get(THEME_COOKIE)?.value,
    storeTheme: process.env.STORE_THEME,
    pickerEnabled: themePickerEnabled(),
  });
}
