"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeSync() {
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    // Força a classe 'dark' no html baseado no tema atual
    const root = document.documentElement;
    const currentTheme = theme === "system" ? systemTheme : theme;
    if (currentTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, systemTheme]);

  return null;
}