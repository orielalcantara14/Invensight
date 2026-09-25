import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
export type FontSize = "small" | "medium" | "large" | "extra-large";

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
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  accentColor: "blue",
  setAccentColor: () => null,
  isCompact: false,
  setIsCompact: () => null,
  fontSize: "medium",
  setFontSize: () => null,
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
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem(`${storageKey}-fontsize`) as FontSize) || "medium"
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
    const sizes: Record<FontSize, string> = {
      "small": "16px",
      "medium": "18px",
      "large": "20px",
      "extra-large": "22px",
    };
    const val = sizes[fontSize] || "18px";
    root.style.fontSize = val;
    root.style.setProperty("--font-size", val);
  }, [fontSize]);

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
    fontSize,
    setFontSize: (size: FontSize) => {
      localStorage.setItem(`${storageKey}-fontsize`, size);
      setFontSizeState(size);
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
