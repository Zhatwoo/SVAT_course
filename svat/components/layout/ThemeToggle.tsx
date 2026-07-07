"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-secondary ${className}`}
      onClick={toggleTheme}
      suppressHydrationWarning
      type="button"
    >
      <span className="material-symbols-outlined text-[22px]" suppressHydrationWarning>
        {!mounted ? "dark_mode" : isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
