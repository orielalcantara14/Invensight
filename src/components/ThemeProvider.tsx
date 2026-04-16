import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  isCompact: boolean;
  setIsCompact: (compact: boolean) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  accentColor: "blue",
  setAccentColor: () => null,
  isCompact: false,
  setIsCompact: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "invensight-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [accentColor, setAccentColor] = useState<string>(
    () => localStorage.getItem(`${storageKey}-accent`) || "blue"
  );
  const [isCompact, setIsCompact] = useState<boolean>(
    () => localStorage.getItem(`${storageKey}-compact`) === "true"
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isCompact) {
      root.classList.add("compact");
    } else {
      root.classList.remove("compact");
    }
  }, [isCompact]);

  useEffect(() => {
    const root = window.document.documentElement;
    const colors: Record<string, string> = {
      blue: "#3b82f6",
      purple: "#a855f7",
      green: "#22c55e",
      orange: "#f97316",
      red: "#ef4444",
    };
    
    const hex = colors[accentColor] || colors.blue;
    root.style.setProperty("--primary", hex);
    // Also update sidebar primary if needed
    root.style.setProperty("--sidebar-primary", hex);
  }, [accentColor]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    accentColor,
    setAccentColor: (color: string) => {
      localStorage.setItem(`${storageKey}-accent`, color);
      setAccentColor(color);
    },
    isCompact,
    setIsCompact: (compact: boolean) => {
      localStorage.setItem(`${storageKey}-compact`, String(compact));
      setIsCompact(compact);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
}
