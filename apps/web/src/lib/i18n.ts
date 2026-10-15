import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN, type MessageKey } from "@/lib/messages.en";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_INFO,
  LANGUAGES,
  isLanguage,
  languageFromTag,
  type Language,
} from "@/lib/languages";

export { DEFAULT_LANGUAGE, LANGUAGE_INFO, LANGUAGES, isLanguage, languageFromTag };
export type { Language };
export const LANGUAGE_STORAGE_KEY = "layerling.language";

/** Each language's own name, for the language list. */
export const LANGUAGE_NAMES: Record<Language, string> = Object.fromEntries(
  LANGUAGES.map((language) => [language, LANGUAGE_INFO[language].name]),
) as Record<Language, string>;

/**
 * A language's sentences. A language that is not complete leaves out the ones it has not
 * translated yet, and the English sentence shows in their place.
 */
export type Catalogue = Partial<Record<MessageKey, string>>;
export type CatalogueLoader = () => Promise<Catalogue>;

/**
 * The sentences of every language that has been loaded, and the way to fetch the others. English
 * is always there, it is what every other language falls back to; German is built in too, as
 * the server's page for search engines reads it. A language added after them is a file of its
 * own that the browser fetches only when someone chooses it, so a new language adds nothing to
 * the page everybody loads.
 */
export function createCatalogueStore(
  initial: Partial<Record<string, Catalogue>>,
  loaders: Partial<Record<string, CatalogueLoader>>,
) {
  const loaded: Partial<Record<string, Catalogue>> = { ...initial };
  const loading = new Map<string, Promise<void>>();
  const sentenceSets = new Map<string, Set<string>>();
  return {
    /** Whether a text is one of a language's own sentences, as it stands. */
    hasSentence(language: string, text: string): boolean {
      const catalogue = loaded[language];
      if (!catalogue) return false;
      let sentences = sentenceSets.get(language);
      if (!sentences) {
        sentences = new Set(Object.values(catalogue));
        sentenceSets.set(language, sentences);
      }
      return sentences.has(text);
    },
    isLoaded: (language: string) => Boolean(loaded[language]),
    /** Fetches a language's sentences once; resolves when they are there. */
    load(language: string): Promise<void> {
      if (loaded[language]) return Promise.resolve();
      const loader = loaders[language];
      if (!loader) return Promise.reject(new Error(`No catalogue for ${language}`));
      let pending = loading.get(language);
      if (!pending) {
        pending = loader()
          .then((catalogue) => {
            loaded[language] = catalogue;
          })
          .finally(() => {
            loading.delete(language);
          });
        loading.set(language, pending);
      }
      return pending;
    },
    /** The sentence in a language; English where that language does not have it, the key as the last resort. */
    text(language: string, key: MessageKey): string {
      return loaded[language]?.[key] ?? MESSAGES_EN[key] ?? key;
    },
  };
}

/** Fetching a further language: one line per language that is not built in, `() => import("@/lib/messages.xx").then((module) => module.MESSAGES_XX)`. */
const LOADERS: Partial<Record<Language, CatalogueLoader>> = {
  nl: () => import("@/lib/messages.nl").then((module) => module.MESSAGES_NL),
  // Polish is a separate chunk: only browsers that pick Polish download it.
  pl: () => import("@/lib/messages.pl").then((module) => module.MESSAGES_PL),
  // Russian is a separate chunk as well: the fork adds it, the author has no Russian.
  ru: () => import("@/lib/messages.ru").then((module) => module.MESSAGES_RU),
};

const catalogues = createCatalogueStore({ en: MESSAGES_EN, de: MESSAGES_DE }, LOADERS);

/**
 * The current language lives in a module-level store rather than in React
 * context: notices are produced in plain callbacks and helpers all over the
 * editor, and those need `t()` without a hook.
 */
let current: Language = DEFAULT_LANGUAGE;
/** The language the person asked for last, which may still be loading; an earlier request that finishes later is dropped. */
let requested: Language = DEFAULT_LANGUAGE;
const listeners = new Set<() => void>();

/**
 * React stays out of this module on purpose: it is reached from server code
 * through the project format, and a hook import there fails the build. The
 * hook that wraps this lives in `useLanguage.ts`.
 */
export function subscribeToLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLanguage(): Language {
  return current;
}

function applyLanguage(language: Language, persist: boolean) {
  if (language === current) return;
  current = language;
  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // A browser that refuses storage still gets the language for this visit.
    }
  }
  // Screen readers and hyphenation read this, not just the eye - and the
  // server always renders "en", so a stored German choice has to correct it
  // here, once, on the one path every language change already takes.
  if (typeof document !== "undefined") {
    document.documentElement.lang = LANGUAGE_INFO[language].htmlLang;
  }
  listeners.forEach((listener) => listener());
}

/**
 * Switches the interface language. A language that is built in switches at once; any other is
 * fetched first and switches when its sentences are there, which the returned promise reports.
 * If the fetch fails the language stays as it was.
 */
export function setLanguage(language: Language, persist = true): Promise<void> {
  requested = language;
  if (catalogues.isLoaded(language)) {
    applyLanguage(language, persist);
    return Promise.resolve();
  }
  return catalogues
    .load(language)
    .then(() => {
      if (requested === language) applyLanguage(language, persist);
    })
    .catch(() => {
      if (requested === language) requested = current;
    });
}

/** Stored choice first, then what the browser asks for, then English. */
export function detectLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Fall through to the browser's own preference.
  }
  for (const tag of window.navigator.languages ?? [window.navigator.language]) {
    const language = languageFromTag(tag);
    if (language) return language;
  }
  return DEFAULT_LANGUAGE;
}

export function translate(
  language: Language,
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  const template = catalogues.text(language, key);
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

/** The everyday form: uses whatever language is current right now. */
export function t(key: MessageKey, values?: Record<string, string | number>): string {
  return translate(current, key, values);
}

/** Whether a text is one of the current language's own interface sentences, as it stands. */
export function isInterfaceSentence(text: string, language: Language = current): boolean {
  return catalogues.hasSentence(language, text);
}

/** A text that exists in some languages, in the current one or else in English. */
export function localizedText(text: { en: string } & Partial<Record<Language, string>>, language: Language): string {
  return text[language] || text.en;
}

/** The locale this language writes its numbers in. */
export function numberLocale(language: Language = current): string {
  return LANGUAGE_INFO[language].numberLocale;
}

export type { MessageKey };
