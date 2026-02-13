import { useState, useEffect } from "react";
import { useSettingsStore } from "../store/settingsStore";

const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");

/**
 * Resolves the theme setting ("light" | "dark" | "system") to a boolean.
 * When set to "system", listens to OS-level dark mode changes.
 */
export function useIsDarkMode(): boolean {
  const theme = useSettingsStore((s) => s.settings.appearance.theme);
  const [systemDark, setSystemDark] = useState(darkModeQuery.matches);

  useEffect(() => {
    if (theme !== "system") return;
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    darkModeQuery.addEventListener("change", handler);
    return () => darkModeQuery.removeEventListener("change", handler);
  }, [theme]);

  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemDark;
}
