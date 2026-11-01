import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTheme,
  resolveInitialTheme,
  getNextTheme,
  applyThemeToDom,
  THEME_STORAGE_KEY,
  THEME_PALETTE_TOKENS,
} from './themeManager';

function createMockElement() {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  const cssVars = new Map<string, string>();
  const style = {
    colorScheme: '',
    setProperty(name: string, val: string) {
      cssVars.set(name, val);
    },
    getPropertyValue(name: string) {
      return cssVars.get(name) || '';
    },
  };

  return {
    attributes,
    classes,
    cssVars,
    style,
    setAttribute(name: string, val: string) {
      attributes.set(name, val);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    classList: {
      toggle(cls: string, force?: boolean) {
        const shouldAdd = force !== undefined ? force : !classes.has(cls);
        if (shouldAdd) classes.add(cls);
        else classes.delete(cls);
        return shouldAdd;
      },
      contains(cls: string) {
        return classes.has(cls);
      },
    },
  };
}

test('normalizeTheme handles valid and invalid values', () => {
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('LIGHT'), 'light');
  assert.equal(normalizeTheme('  dark  '), 'dark');
  assert.equal(normalizeTheme('invalid'), null);
  assert.equal(normalizeTheme(null), null);
  assert.equal(normalizeTheme(undefined), null);
});

test('resolveInitialTheme prioritizes stored theme and falls back to system preference', () => {
  assert.equal(
    resolveInitialTheme({ storedTheme: 'dark', prefersDark: false }),
    'dark'
  );
  assert.equal(
    resolveInitialTheme({ storedTheme: 'light', prefersDark: true }),
    'light'
  );
  assert.equal(
    resolveInitialTheme({ storedTheme: null, prefersDark: true }),
    'dark'
  );
  assert.equal(
    resolveInitialTheme({ storedTheme: null, prefersDark: false }),
    'light'
  );
});

test('getNextTheme toggles between light and dark', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
});

test('applyThemeToDom synchronously updates documentElement, body, CSS variables, and storage', () => {
  const documentElement = createMockElement();
  const body = createMockElement();
  const stored = new Map<string, string>();

  const mockDoc = {
    documentElement,
    body,
  } as unknown as Document;

  const mockStorage = {
    setItem(key: string, value: string) {
      stored.set(key, value);
    },
  };

  // Switch to dark mode
  applyThemeToDom('dark', mockDoc, mockStorage);

  assert.equal(documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(body.getAttribute('data-theme'), 'dark');
  assert.equal(documentElement.classList.contains('dark'), true);
  assert.equal(documentElement.classList.contains('light'), false);
  assert.equal(body.classList.contains('dark'), true);
  assert.equal(documentElement.style.colorScheme, 'dark');
  assert.equal(body.style.colorScheme, 'dark');
  assert.equal(
    documentElement.style.getPropertyValue('--surface'),
    THEME_PALETTE_TOKENS.dark.surface
  );
  assert.equal(
    documentElement.style.getPropertyValue('--ink'),
    THEME_PALETTE_TOKENS.dark.ink
  );
  assert.equal(stored.get(THEME_STORAGE_KEY), 'dark');

  // Switch back to light mode immediately without refresh
  applyThemeToDom('light', mockDoc, mockStorage);

  assert.equal(documentElement.getAttribute('data-theme'), 'light');
  assert.equal(body.getAttribute('data-theme'), 'light');
  assert.equal(documentElement.classList.contains('dark'), false);
  assert.equal(documentElement.classList.contains('light'), true);
  assert.equal(body.classList.contains('dark'), false);
  assert.equal(documentElement.style.colorScheme, 'light');
  assert.equal(body.style.colorScheme, 'light');
  assert.equal(
    documentElement.style.getPropertyValue('--surface'),
    THEME_PALETTE_TOKENS.light.surface
  );
  assert.equal(
    documentElement.style.getPropertyValue('--ink'),
    THEME_PALETTE_TOKENS.light.ink
  );
  assert.equal(stored.get(THEME_STORAGE_KEY), 'light');
});
