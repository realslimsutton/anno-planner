import type {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
} from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ScriptOnce } from "@tanstack/react-router";

type ValueObject = Record<string, string>;

export type UseThemeProps = {
  themes: string[];
  forcedTheme?: string | undefined;
  setTheme: Dispatch<SetStateAction<string>>;
  theme?: string | undefined;
  systemTheme?: "dark" | "light" | undefined;
};

export type Attribute = `data-${string}` | "class";

export interface ThemeProviderProps extends PropsWithChildren {
  themes?: string[] | undefined;
  forcedTheme?: string | undefined;
  enableSystem?: boolean | undefined;
  disableTransitionOnChange?: boolean | undefined;
  enableColorScheme?: boolean | undefined;
  storageKey?: string | undefined;
  defaultTheme?: string | undefined;
  attribute?: Attribute | Attribute[] | undefined;
  value?: ValueObject | undefined;
}

const colorSchemes = ["light", "dark"];
const MEDIA = "(prefers-color-scheme: dark)";
const isServer = typeof window === "undefined";
const ThemeContext = createContext<UseThemeProps | undefined>(undefined);
const defaultContext: UseThemeProps = {
  setTheme: () => null,
  themes: [],
};

export const useTheme = () => useContext(ThemeContext) ?? defaultContext;

export const ThemeProvider = (props: ThemeProviderProps): ReactNode => {
  const context = useContext(ThemeContext);

  if (context) {
    return props.children;
  }
  return <Theme {...props} />;
};

const defaultThemes = ["light", "dark"];

const Theme = ({
  forcedTheme,
  disableTransitionOnChange = false,
  enableSystem = true,
  enableColorScheme = true,
  storageKey = "theme",
  themes = defaultThemes,
  defaultTheme = enableSystem ? "system" : "light",
  attribute = "class",
  value,
  children,
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState(() =>
    getTheme(storageKey, defaultTheme),
  );

  const applyClassAttribute = useCallback(
    (name: string | undefined, attrValues: string[]) => {
      const d = document.documentElement;
      d.classList.remove(...attrValues);
      if (name) {
        d.classList.add(name);
      }
    },
    [],
  );

  const applyDataAttribute = useCallback(
    (attr: string, name: string | undefined) => {
      const d = document.documentElement;
      if (name) {
        d.setAttribute(attr, name);
      } else {
        d.removeAttribute(attr);
      }
    },
    [],
  );

  const applyAttributesToDOM = useCallback(
    (resolved: string) => {
      const attributeList = Array.isArray(attribute) ? attribute : [attribute];
      const attrValues = value ? Object.values(value) : themes;
      const name = value ? value[resolved] : resolved;

      for (const attr of attributeList) {
        if (attr === "class") {
          applyClassAttribute(name, attrValues);
        } else if (attr.startsWith("data-")) {
          applyDataAttribute(attr, name);
        }
      }
    },
    [attribute, themes, value, applyClassAttribute, applyDataAttribute],
  );

  const applyColorScheme = useCallback(
    (resolved: string) => {
      if (!enableColorScheme) {
        return;
      }
      const fallback = colorSchemes.includes(defaultTheme)
        ? defaultTheme
        : null;
      const colorScheme = colorSchemes.includes(resolved) ? resolved : fallback;
      document.documentElement.style.colorScheme = colorScheme ?? "";
    },
    [enableColorScheme, defaultTheme],
  );

  const applyTheme = useCallback(
    (nextTheme: string | undefined) => {
      if (!nextTheme) {
        return;
      }

      const resolved =
        nextTheme === "system" && enableSystem ? getSystemTheme() : nextTheme;

      const enable = disableTransitionOnChange ? disableAnimation() : null;

      applyAttributesToDOM(resolved);
      applyColorScheme(resolved);

      enable?.();
    },
    [
      enableSystem,
      disableTransitionOnChange,
      applyAttributesToDOM,
      applyColorScheme,
    ],
  );

  const setTheme = useCallback(
    (newValue: SetStateAction<string>) => {
      const newTheme =
        typeof newValue === "function" ? newValue(theme ?? "") : newValue;
      setThemeState(newTheme);

      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // localStorage might not be available
      }
    },
    [theme, storageKey],
  );

  const handleMediaQuery = useCallback(
    (_event: MediaQueryListEvent | MediaQueryList) => {
      if (theme === "system" && enableSystem && !forcedTheme) {
        applyTheme("system");
      }
    },
    [applyTheme, enableSystem, forcedTheme, theme],
  );

  useEffect(() => {
    if (isServer) {
      return;
    }

    const media = window.matchMedia(MEDIA);

    media.addListener(handleMediaQuery);
    handleMediaQuery(media);

    return () => media.removeListener(handleMediaQuery);
  }, [handleMediaQuery]);

  useEffect(() => {
    if (isServer) {
      return;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== storageKey) {
        return;
      }

      const newTheme = e.newValue ?? defaultTheme;
      setTheme(newTheme);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [defaultTheme, setTheme, storageKey]);

  useEffect(() => {
    applyTheme(forcedTheme ?? theme);
  }, [applyTheme, forcedTheme, theme]);

  const providerValue = useMemo(
    () =>
      ({
        theme,
        setTheme,
        forcedTheme,
        themes: enableSystem ? [...themes, "system"] : themes,
        systemTheme: enableSystem ? getSystemTheme() : undefined,
      }) as UseThemeProps,
    [theme, forcedTheme, enableSystem, themes, setTheme],
  );

  return (
    <ThemeContext.Provider value={providerValue}>
      <ThemeScript
        {...{
          forcedTheme,
          storageKey,
          attribute,
          enableSystem,
          enableColorScheme,
          defaultTheme,
          value,
          themes,
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeScript = memo(
  ({
    forcedTheme,
    storageKey,
    attribute,
    enableSystem,
    enableColorScheme,
    defaultTheme,
    value,
    themes,
  }: Omit<ThemeProviderProps, "children"> & { defaultTheme: string }) => {
    const scriptArgs = JSON.stringify([
      attribute,
      storageKey,
      defaultTheme,
      forcedTheme,
      themes,
      value,
      enableSystem,
      enableColorScheme,
    ]).slice(1, -1);

    return <ScriptOnce children={`(${script.toString()})(${scriptArgs})`} />;
  },
);

ThemeScript.displayName = "ThemeScript";

const getTheme = (key: string, fallback?: string) => {
  if (isServer) {
    return fallback;
  }
  let theme: string | undefined;
  try {
    theme = localStorage.getItem(key) ?? undefined;
  } catch {
    // localStorage might not be available
  }
  return theme ?? fallback;
};

const disableAnimation = () => {
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
    ),
  );
  document.head.appendChild(css);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(css);
    }, 1);
  };
};

const getSystemTheme = (e?: MediaQueryList | MediaQueryListEvent) => {
  if (isServer) {
    return "light";
  }
  const event = e ?? window.matchMedia(MEDIA);
  const isDark = event.matches;
  const systemTheme = isDark ? "dark" : "light";
  return systemTheme;
};

export const script = (
  attribute: Attribute | Attribute[],
  storageKey: string,
  defaultTheme: string,
  forcedTheme: string | undefined,
  themes: string[],
  value: ValueObject | undefined,
  enableSystem: boolean,
  enableColorScheme: boolean,
) => {
  const el = document.documentElement;
  const systemThemes = ["light", "dark"];
  const attributes = Array.isArray(attribute) ? attribute : [attribute];
  const attrValues = value ? Object.values(value) : themes;

  function applyClassAttr(name: string | undefined) {
    el.classList.remove(...attrValues);
    if (name) {
      el.classList.add(name);
    }
  }

  function applyDataAttr(attr: string, name: string | undefined) {
    if (name) {
      el.setAttribute(attr, name);
    } else {
      el.removeAttribute(attr);
    }
  }

  function updateDOM(theme: string) {
    const name = value ? value[theme] : theme;

    for (const attr of attributes) {
      if (attr === "class") {
        applyClassAttr(name);
      } else if (attr.startsWith("data-")) {
        applyDataAttr(attr, name);
      }
    }

    setColorScheme(theme);
  }

  function setColorScheme(theme: string) {
    if (!enableColorScheme) {
      return;
    }

    const fallback = systemThemes.includes(defaultTheme) ? defaultTheme : null;
    const colorScheme = systemThemes.includes(theme) ? theme : fallback;
    el.style.colorScheme = colorScheme ?? "";
  }

  function resolveSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  if (forcedTheme) {
    const resolvedForcedTheme =
      forcedTheme === "system" && enableSystem
        ? resolveSystemTheme()
        : forcedTheme;
    updateDOM(resolvedForcedTheme);
  } else {
    try {
      const themeName = localStorage.getItem(storageKey) ?? defaultTheme;
      const isSystem = enableSystem && themeName === "system";
      const theme = isSystem ? resolveSystemTheme() : themeName;
      updateDOM(theme);
    } catch {
      // localStorage might not be available
    }
  }
};
