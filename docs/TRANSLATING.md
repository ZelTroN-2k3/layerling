# Translating layerling

layerling speaks English, German and Dutch in full. Further languages are welcome (see the
[discussion](https://github.com/henmedia/layerling/discussions/141)); this page is how to add one. You do not have to
finish it in one go: a language may start with a few hundred sentences and one chapter of the guide, and everything
it does not have yet shows in English.

A language is three things:

1. **An entry** in `apps/web/src/lib/languages.ts`: its name, how it writes numbers, its quotation marks, where its
   community meets, and the words of the guide pages.
2. **The sentences of the interface**, in `apps/web/src/lib/messages.<code>.ts` (about 2,300 of them).
3. **The user guide**, in `docs/guide/<code>/` (16 chapters).

## Adding a language

1. **Register it.** In `languages.ts` add the code to `LANGUAGES` and an entry to `LANGUAGE_INFO`. Copy the English
   one and change it. Leave `complete: false` for now. Name chapters like the English files (`readme: "README.md"` is
   right until the language has its own README).
2. **The sentences.** Copy `messages.en.ts` to `messages.<code>.ts`, change the export to `MESSAGES_<CODE>` and its
   type to `Partial<Record<MessageKey, string>>`, and translate. Delete the sentences you have not translated yet;
   do not leave English in them. Keep every `{placeholder}` exactly as it is, the program fills it in. You can work on
   it in parts and save at any time.
3. **Let the program fetch it.** In `apps/web/src/lib/i18n.ts` add one line to `LOADERS`:
   `xx: () => import("@/lib/messages.xx").then((module) => module.MESSAGES_XX),`. The sentences are then a file of
   their own that the browser loads only when somebody picks the language, so a new language costs nobody else
   anything.
4. **The guide.** Create `docs/guide/<code>/`, copy the chapters you want to translate there **with the same file
   names as the English ones** (`03-shapes.md`), and translate the text. The number in front pairs a chapter with the
   English one. The chapters you leave out are built from the English ones, with a line saying so at the top.
   Buttons are written `{{ui:key}}`, never by hand: the guide takes their names from your sentences, so they always
   match the interface. The pictures are shared, do not add copies.

   Once every chapter is translated, a language may give them names of its own, as German and Dutch do
   (`03-vormen.md`): add the names to `GUIDE_CHAPTERS` in `apps/web/src/lib/guideLinks.ts`, and the ids of the
   translated headings to `GUIDE_SECTIONS`, so the question marks in the program land on the right page and
   heading. The tests in `tests/unit/guide.test.ts` check both against the chapters.
5. **Check.**

   ```
   npm run i18n:status              how much each language has, and what is wrong
   npm run i18n:status -- xx        the sentences still missing, with their English text
   npm run guide                    builds the guide
   npm run typecheck
   npm test
   ```

## What has to be right

- No sentence without an English original (a sentence removed from English must go from yours too), none empty, and
  the same `{placeholders}` as the English one. The tests check this for every language, finished or not.
- A language marked `complete: true` in `languages.ts` has every sentence and every chapter, and the tests then
  insist on it. Mark it only when it is.
- **Two readers** are wanted for a language before it goes into a release: people who speak it and have read each
  other's work. It is a strong wish, not a rule; say in the discussion who has read it.

## What stays English

The changelog, the AI (MCP) tool descriptions, the legal pages of a site and the support page. Error messages that
come from the CAD kernel arrive in English, and a few that a rule recognises are translated.

## Keeping up

When a feature is added, its sentences are written in English and German. Another language falls behind until its
translators catch up, and shows the English sentence meanwhile. `npm run i18n:status -- xx` lists what is missing
after a release.

## Check before you rely on it

Fonts: the lettering shapes need the letters of your language. Test the shape "Text" with a typical word before
you tell people it works. Date and number formats follow `numberLocale` in your entry.
