export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'btd-theme';

export const THEME_PALETTE_TOKENS: Record<
  ThemeMode,
  {
    bg: string;
    surface: string;
    surface2: string;
    ink: string;
    ink2: string;
    line: string;
    brand: string;
    brandSoft: string;
    themeColorMeta: string;
  }
> = {
  light: {
    bg: '#F1F5F2',
    surface: '#FFFFFF',
    surface2: '#E6EDE8',
    ink: '#13231C',
    ink2: '#52645B',
    line: '#D3DDD6',
    brand: '#0D5B49',
    brandSoft: '#DCEEE6',
    themeColorMeta: '#0D5B49',
  },
  dark: {
    bg: '#0A0E27',
    surface: '#16231D',
    surface2: '#1E2E26',
    ink: '#E7F0EA',
    ink2: '#9DB0A5',
    line: '#2B3C34',
    brand: '#0D5B49',
    brandSoft: '#173A2F',
    themeColorMeta: '#0A0E27',
  },
};

/**
 * Validates and normalizes an arbitrary theme string into 'light' | 'dark' or null.
 */
export function normalizeTheme(value?: string | null): ThemeMode | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'dark' || trimmed === 'light') {
    return trimmed;
  }
  return null;
}

/**
 * Resolves the initial theme from saved storage preference or system media query.
 */
export function resolveInitialTheme(options?: {
  storedTheme?: string | null;
  prefersDark?: boolean;
}): ThemeMode {
  const normalized = normalizeTheme(options?.storedTheme);
  if (normalized) {
    return normalized;
  }
  return options?.prefersDark ? 'dark' : 'light';
}

/**
 * Returns the opposite theme when toggling.
 */
export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

/**
 * Synchronously applies the active theme to the DOM root (`<html>`) and `<body>`
 * so both CSS custom properties (`[data-theme="dark"]`) and Tailwind `dark:*`
 * variants (`.dark`) take effect immediately on all static and dynamically
 * generated UI elements without requiring a refresh.
 */
export function applyThemeToDom(
  theme: ThemeMode,
  doc?: Document | null,
  storage?: Pick<Storage, 'setItem'> | null
): ThemeMode {
  const resolvedTheme: ThemeMode = theme === 'dark' ? 'dark' : 'light';
  const isDark = resolvedTheme === 'dark';
  const tokens = THEME_PALETTE_TOKENS[resolvedTheme];

  const targetDoc =
    doc !== undefined ? doc : typeof document !== 'undefined' ? document : null;

  if (targetDoc) {
    const root = targetDoc.documentElement;
    if (root) {
      root.setAttribute('data-theme-switching', 'true');
      root.setAttribute('data-theme', resolvedTheme);
      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
      if (root.style) {
        root.style.colorScheme = resolvedTheme;
        root.style.setProperty('--bg', tokens.bg);
        root.style.setProperty('--surface', tokens.surface);
        root.style.setProperty('--surface2', tokens.surface2);
        root.style.setProperty('--ink', tokens.ink);
        root.style.setProperty('--ink2', tokens.ink2);
        root.style.setProperty('--line', tokens.line);
        root.style.setProperty('--brand-soft', tokens.brandSoft);
      }
    }

    const body = targetDoc.body;
    if (body) {
      body.setAttribute('data-theme', resolvedTheme);
      body.classList.toggle('dark', isDark);
      body.classList.toggle('light', !isDark);
      if (body.style) {
        body.style.colorScheme = resolvedTheme;
      }
    }

    if (root) {
      // Force style recalculation so the theme change is committed immediately without transition lag
      if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function' && body) {
        try {
          void window.getComputedStyle(body).backgroundColor;
        } catch {
          // ignore
        }
      }
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          root.removeAttribute('data-theme-switching');
        });
      } else {
        root.removeAttribute('data-theme-switching');
      }
    }
  }

  const targetStorage =
    storage !== undefined
      ? storage
      : typeof localStorage !== 'undefined'
      ? localStorage
      : null;

  if (targetStorage) {
    try {
      targetStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);
    } catch {
      // ignore storage quota / privacy errors
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('btd-theme-changed', {
          detail: { theme: resolvedTheme },
        })
      );
    } catch {
      // ignore in non-browser test environments
    }
  }

  return resolvedTheme;
}

/**
 * Reads the current initial theme from browser environment (`localStorage` + `matchMedia`).
 */
export function getBrowserInitialTheme(): ThemeMode {
  let storedTheme: string | null = null;
  let prefersDark = false;

  try {
    if (typeof localStorage !== 'undefined') {
      storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    }
  } catch {
    // ignore
  }

  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } catch {
    // ignore
  }

  return resolveInitialTheme({ storedTheme, prefersDark });
}
