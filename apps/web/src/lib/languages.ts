/**
 * The languages layerling speaks, and everything about each one that is not a translated
 * sentence: how it names itself, how it writes numbers, where its community meets, what its
 * guide pages call things. One entry per language is all the code has to know; the sentences
 * themselves live in `messages.<code>.ts` and the guide in `docs/guide/<code>/`.
 *
 * Plain data on purpose, with no imports: the interface reaches it, and so does the guide builder
 * (scripts/build-guide.mjs) and the translation status script, which read it as a module in Node.
 * Keep it to what Node can run as it stands: types and constants, nothing else.
 *
 * To add a language, see docs/TRANSLATING.md.
 */
export const LANGUAGES = ["en", "de", "nl", "fr", "pl", "ru"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

/** The words of a guide page that are not chapter text, in the language of the page. */
export type GuideStrings = {
  site: string;
  home: string;
  openEditor: string;
  backToEditor: string;
  editorElsewhere: string;
  chapters: string;
  onThisPage: string;
  previous: string;
  next: string;
  overviewLead: string;
  sourceNote: string;
  forum: string;
  /** Said at the top of a chapter that is not translated yet and shows its English text. */
  notTranslated: string;
  /** The label of the language menu on a guide page. */
  languageMenu: string;
  /** The search box at the top of a guide page: what it is called and what it says when nothing matches. */
  search: string;
  searchNothing: string;
  /** The link to the page with every chapter in a row, and what that page says (for printing the guide). */
  printAll: string;
  printAllTitle: string;
  printAllLead: string;
  printContents: string;
  printButton: string;
};

export type LanguageInfo = {
  /** The language's own name, as the language list shows it. */
  name: string;
  /** The tag for the `lang` attribute and for hreflang. */
  htmlLang: string;
  /** The locale numbers are written in (separators, grouping). */
  numberLocale: string;
  /** Opening and closing quotation marks. */
  quotes: readonly [string, string];
  /** Folder of its guide pages under the site root. */
  guideDir: string;
  /** Where its community meets: the forum or the project's discussions. */
  communityUrl: string;
  /** The README that explains the project in this language, as a file name in the repository. */
  readme: string;
  /** The anchor of the Windows quickstart section in that README. */
  quickstartAnchor: string;
  /** The built-in labels of the legal links in the footer. */
  legal: { imprint: string; privacy: string };
  /**
   * Whether people write "ae", "oe" and "ue" for the letters ä, ö and ü, as German does when the
   * keyboard has none; the guide search then finds one for the other.
   */
  asciiUmlauts: boolean;
  /** Names of keys and mouse actions where the language does not use the English ones. */
  keyNames: Readonly<Record<string, string>>;
  /**
   * Whether the language has every sentence of the interface. A complete language is held to it by
   * a test; any other shows the English sentence where its own is missing.
   */
  complete: boolean;
  guide: GuideStrings;
};

const GITHUB_DISCUSSIONS = "https://github.com/henmedia/layerling/discussions";
const DRUCKTIPPS_FORUM = "https://forum.drucktipps3d.de/forum/board/127-layerling/";

export const LANGUAGE_INFO: Readonly<Record<Language, LanguageInfo>> = {
  en: {
    name: "English",
    htmlLang: "en",
    numberLocale: "en-US",
    quotes: ["“", "”"],
    guideDir: "guide",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Imprint", privacy: "Privacy Policy" },
    keyNames: { RightClick: "Right click" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "layerling user guide",
      home: "User guide",
      openEditor: "Open the editor",
      backToEditor: "Back to the editor",
      editorElsewhere: "The editor is already open in another tab - just switch to it.",
      chapters: "Chapters",
      onThisPage: "On this page",
      previous: "Previous chapter",
      next: "Next chapter",
      overviewLead: "Everything layerling can do, step by step. The pictures are taken from the running program and are renewed with every version.",
      sourceNote: "This guide grows with the program. If something is missing or wrong, tell us in the",
      forum: "discussions",
      notTranslated: "This chapter is not translated into your language yet. The English text follows.",
      languageMenu: "Language",
      search: "Search the guide",
      searchNothing: "Nothing found.",
      printAll: "Whole guide, to print",
      printAllTitle: "The whole guide on one page",
      printAllLead: "Every chapter one after the other, to print or to save as a PDF: press Ctrl+P and switch off \"Headers and footers\" in the print settings. To print only a part, choose its page numbers there.",
      printContents: "Contents",
      printButton: "Print",
    },
  },
  de: {
    name: "Deutsch",
    htmlLang: "de",
    numberLocale: "de-DE",
    quotes: ["„", "“"],
    guideDir: "anleitung",
    communityUrl: DRUCKTIPPS_FORUM,
    readme: "README.de.md",
    quickstartAnchor: "schnellstart-unter-windows",
    legal: { imprint: "Impressum", privacy: "Datenschutz" },
    keyNames: { Ctrl: "Strg", Shift: "Umschalt", Delete: "Entf", Backspace: "Rücktaste", Home: "Pos1", Click: "Klick", RightClick: "Rechtsklick", Drag: "Ziehen" },
    asciiUmlauts: true,
    complete: true,
    guide: {
      site: "layerling Anleitung",
      home: "Anleitung",
      openEditor: "Zum Editor",
      backToEditor: "Zurück zum Editor",
      editorElsewhere: "Der Editor ist schon in einem anderen Tab offen - wechsle einfach dorthin.",
      chapters: "Kapitel",
      onThisPage: "Auf dieser Seite",
      previous: "Vorheriges Kapitel",
      next: "Nächstes Kapitel",
      overviewLead: "Alles, was layerling kann, Schritt für Schritt. Die Bilder entstehen aus dem laufenden Programm und werden mit jeder Fassung neu aufgenommen.",
      sourceNote: "Diese Anleitung wächst mit dem Programm. Fehlt dir etwas oder stimmt etwas nicht, sag es im",
      forum: "Forum",
      notTranslated: "Dieses Kapitel ist noch nicht in deine Sprache übersetzt. Es folgt der englische Text.",
      languageMenu: "Sprache",
      search: "Anleitung durchsuchen",
      searchNothing: "Nichts gefunden.",
      printAll: "Ganze Anleitung zum Drucken",
      printAllTitle: "Die ganze Anleitung auf einer Seite",
      printAllLead: "Alle Kapitel hintereinander, zum Drucken oder zum Speichern als PDF: Drücke Strg+P und schalte in den Druckeinstellungen „Kopf- und Fußzeilen“ aus. Möchtest du nur einen Teil drucken, wähle dort die Seitenzahlen.",
      printContents: "Inhalt",
      printButton: "Drucken",
    },
  },
  nl: {
    name: "Nederlands",
    htmlLang: "nl",
    numberLocale: "nl-NL",
    quotes: ["“", "”"],
    guideDir: "handleiding",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.nl.md",
    quickstartAnchor: "snelstart-op-windows",
    legal: { imprint: "Colofon", privacy: "Privacybeleid" },
    keyNames: { Click: "Klik", RightClick: "Rechtsklik", Drag: "Slepen" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "layerling handleiding",
      home: "Handleiding",
      openEditor: "Naar de editor",
      backToEditor: "Terug naar de editor",
      editorElsewhere: "De editor is al open in een ander tabblad - schakel daar gewoon naartoe.",
      chapters: "Hoofdstukken",
      onThisPage: "Op deze pagina",
      previous: "Vorig hoofdstuk",
      next: "Volgend hoofdstuk",
      overviewLead: "Alles wat layerling kan, stap voor stap. De afbeeldingen komen uit het draaiende programma en worden bij elke versie opnieuw gemaakt.",
      sourceNote: "Deze handleiding groeit mee met het programma. Mis je iets of klopt er iets niet, laat het ons weten in de",
      forum: "discussies",
      notTranslated: "Dit hoofdstuk is nog niet in jouw taal vertaald. Hieronder volgt de Engelse tekst.",
      languageMenu: "Taal",
      search: "Handleiding doorzoeken",
      searchNothing: "Niets gevonden.",
      printAll: "Hele handleiding, om af te drukken",
      printAllTitle: "De hele handleiding op één pagina",
      printAllLead: "Alle hoofdstukken achter elkaar, om af te drukken of als pdf op te slaan: druk op Ctrl+P en zet in de afdrukinstellingen \"Kop- en voetteksten\" uit. Wil je maar een deel afdrukken, kies daar dan de paginanummers.",
      printContents: "Inhoud",
      printButton: "Afdrukken",
    },
  },
  fr: {
    name: "Français",
    htmlLang: "fr",
    numberLocale: "fr-FR",
    quotes: ["« ", " »"],
    guideDir: "guide-fr",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Mentions légales", privacy: "Politique de confidentialité" },
    keyNames: {
      Ctrl: "Ctrl",
      Shift: "Maj",
      Delete: "Suppr",
      Backspace: "Retour arrière",
      Home: "Début",
      Click: "Clic",
      RightClick: "Clic droit",
      Drag: "Glisser",
    },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "Manuel d'utilisation layerling",
      home: "Manuel d'utilisation",
      openEditor: "Ouvrir l'éditeur",
      backToEditor: "Retour à l'éditeur",
      editorElsewhere: "L'éditeur est déjà ouvert dans un autre onglet - basculez simplement vers lui.",
      chapters: "Chapitres",
      onThisPage: "Sur cette page",
      previous: "Chapitre précédent",
      next: "Chapitre suivant",
      overviewLead: "Tout ce que layerling peut faire, pas à pas. Les images proviennent du programme en cours d'exécution et sont renouvelées à chaque version.",
      sourceNote: "Ce manuel grandit avec le programme. Si quelque chose manque ou est inexact, dites-le nous dans les",
      forum: "discussions",
      notTranslated: "Ce chapitre n'est pas encore traduit en français. Le texte en anglais suit.",
      languageMenu: "Langue",
      search: "Rechercher dans le manuel",
      searchNothing: "Aucun résultat trouvé.",
      printAll: "Guide complet, à imprimer",
      printAllTitle: "L'intégralité du guide sur une seule page",
      printAllLead: "Tous les chapitres les uns après les autres, à imprimer ou à enregistrer au format PDF : appuyez sur Ctrl+P et désactivez « En-têtes et pieds de page » dans les paramètres d'impression. Pour imprimer seulement une partie, choisissez ses numéros de page dans la boîte de dialogue.",
      printContents: "Table des matières",
      printButton: "Imprimer",
    },
  },
  // Polish: added as a language that is fetched when chosen, not complete yet (missing sentences show in English).
  // The README and the guide stay English until they are translated, so readme and quickstartAnchor point at the English ones.
  pl: {
    name: "Polski",
    htmlLang: "pl",
    numberLocale: "pl-PL",
    // Polish quotation marks: low opening, high closing (the same pair German uses).
    quotes: ["„", "”"],
    guideDir: "instrukcja",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Nota prawna", privacy: "Polityka prywatności" },
    // Polish keyboards label most keys in English; only the mouse actions get Polish names.
    keyNames: { Click: "Klik", RightClick: "Prawy klik", Drag: "Przeciągnij" },
    asciiUmlauts: false,
    complete: false,
    guide: {
      site: "Instrukcja layerling",
      home: "Instrukcja",
      openEditor: "Otwórz edytor",
      backToEditor: "Wróć do edytora",
      editorElsewhere: "Edytor jest już otwarty w innej karcie - po prostu do niej przejdź.",
      chapters: "Rozdziały",
      onThisPage: "Na tej stronie",
      previous: "Poprzedni rozdział",
      next: "Następny rozdział",
      overviewLead: "Wszystko, co potrafi layerling, krok po kroku. Obrazki pochodzą z działającego programu i są odnawiane przy każdej wersji.",
      sourceNote: "Ta instrukcja rośnie razem z programem. Jeśli czegoś brakuje albo coś się nie zgadza, napisz w",
      forum: "dyskusjach",
      notTranslated: "Ten rozdział nie jest jeszcze przetłumaczony na polski. Poniżej tekst angielski.",
      languageMenu: "Język",
      search: "Szukaj w instrukcji",
      searchNothing: "Nic nie znaleziono.",
      printAll: "Cała instrukcja do wydruku",
      printAllTitle: "Cała instrukcja na jednej stronie",
      printAllLead: "Wszystkie rozdziały jeden po drugim, do wydrukowania lub zapisania jako PDF: naciśnij Ctrl+P i wyłącz w ustawieniach drukowania „Nagłówki i stopki”. Aby wydrukować tylko część, wybierz tam numery stron.",
      printContents: "Spis treści",
      printButton: "Drukuj",
    },
  },
  ru: {
    name: "Русский",
    htmlLang: "ru",
    numberLocale: "ru-RU",
    quotes: ["«", "»"],
    guideDir: "ru",
    communityUrl: GITHUB_DISCUSSIONS,
    readme: "README.md",
    quickstartAnchor: "windows-quickstart",
    legal: { imprint: "Выходные данные", privacy: "Политика конфиденциальности" },
    keyNames: { Ctrl: "Ctrl", Shift: "Shift", Delete: "Del", Backspace: "Backspace", Home: "Home", Click: "Щёлчок", RightClick: "Правый клик", Drag: "Перетаскивание" },
    asciiUmlauts: false,
    complete: true,
    guide: {
      site: "Руководство layerling",
      home: "Руководство",
      openEditor: "Открыть редактор",
      backToEditor: "Вернуться в редактор",
      editorElsewhere: "Редактор уже открыт в другой вкладке — просто переключитесь туда.",
      chapters: "Главы",
      onThisPage: "На этой странице",
      previous: "Предыдущая глава",
      next: "Следующая глава",
      overviewLead: "Всё, что умеет layerling, шаг за шагом. Картинки сняты с работающей программы и обновляются с каждой версией.",
      sourceNote: "Это руководство растёт вместе с программой. Если чего-то не хватает или что-то не так — напишите в",
      forum: "обсуждениях",
      notTranslated: "Эта глава ещё не переведена на ваш язык. Ниже идёт английский текст.",
      languageMenu: "Язык",
      search: "Поиск по руководству",
      searchNothing: "Ничего не найдено.",
      printAll: "Всё руководство для печати",
      printAllTitle: "Всё руководство на одной странице",
      printAllLead: "Все главы подряд — чтобы распечатать или сохранить как PDF: нажмите Ctrl+P и отключите в настройках печати «Колонтитулы». Если нужно распечатать только часть, выберите там номера страниц.",
      printContents: "Содержание",
      printButton: "Печать",
    },
  },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The language a browser asks for, as far as we can serve it. `de-AT` and plain `de` both mean
 * German; anything layerling does not speak falls back to English.
 */
export function languageFromTag(tag: string | undefined | null): Language | null {
  const primary = tag?.trim().toLowerCase().split("-")[0];
  return isLanguage(primary) ? primary : null;
}
