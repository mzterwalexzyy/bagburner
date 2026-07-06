"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-full h-9" />;

  const isDark = theme === "dark";

  return (
    <div className="flex rounded-md border border-border bg-surface-2 p-0.5 text-xs">
      <button
        onClick={() => setTheme("light")}
        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded ${!isDark ? "bg-surface text-foreground" : "text-muted"}`}
        aria-label="Light mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded ${isDark ? "bg-surface text-foreground" : "text-muted"}`}
        aria-label="Dark mode"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
