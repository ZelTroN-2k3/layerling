import { LANGUAGE_INFO, type Language } from "@/lib/i18n";
import type { ShapeKind } from "@/types/layerling";

/**
 * The chapters of the user guide (docs/guide) by what they are about, with the
 * file name each language gave them. The pages are static files next to the
 * program, so a link is a plain path. A test compares this table with the
 * chapters on disk - a chapter renamed there without a change here would leave
 * every question mark pointing nowhere.
 */
export const GUIDE_CHAPTERS = {
  start: { de: "erste-schritte", en: "getting-started", nl: "aan-de-slag" },
  view: { de: "ansicht-und-arbeitsebene", en: "view-and-workplane", nl: "weergave-en-werkvlak" },
  shapes: { de: "formen", en: "shapes", nl: "vormen" },
  select: { de: "auswaehlen-und-anordnen", en: "select-and-arrange", nl: "selecteren-en-schikken" },
  solids: { de: "koerper-und-aussparungen", en: "solids-and-holes", nl: "lichamen-en-gaten" },
  edges: { de: "kanten-und-aushoehlen", en: "edges-and-hollowing", nl: "randen-en-uithollen" },
  sketches: { de: "skizzen", en: "sketches", nl: "schetsen" },
  text: { de: "text", en: "text", nl: "tekst" },
  threads: { de: "gewinde-und-mechanik", en: "threads-and-mechanics", nl: "schroefdraad-en-mechanica" },
  measuring: { de: "messen-und-notizen", en: "measuring-and-notes", nl: "meten-en-notities" },
  printing: { de: "drucken", en: "printing", nl: "printen" },
  files: { de: "dateien-und-speichern", en: "files-and-saving", nl: "bestanden-en-opslaan" },
  shortcuts: { de: "tastenkuerzel", en: "shortcuts", nl: "sneltoetsen" },
  ai: { de: "ki-mit-mcp", en: "ai-with-mcp", nl: "ai-met-mcp" },
  offline: { de: "offline-und-installieren", en: "offline-and-install", nl: "offline-en-installeren" },
} as const satisfies Record<string, { en: string } & Partial<Record<Language, string>>>;

export type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/**
 * Sections inside a chapter that a question mark jumps to directly: the chapter
 * and the id each language's heading gets (slugify in build-guide.mjs). The
 * same test checks every id against the headings on disk.
 */
export const GUIDE_SECTIONS = {
  sectionView: { chapter: "view", de: "ins-innere-schauen-die-schnittansicht", en: "looking-inside-the-section-view", nl: "naar-binnen-kijken-de-doorsnede" },
  gridAndSnapping: { chapter: "view", de: "gitter-und-raster", en: "grid-and-snapping", nl: "raster-en-vastklikken" },
  shapeSettings: { chapter: "shapes", de: "die-einstellungen-der-form", en: "the-shape-s-settings", nl: "de-instellingen-van-de-vorm" },
  wrapCylinder: { chapter: "shapes", de: "um-einen-zylinder-wickeln", en: "wrapping-around-a-cylinder", nl: "om-een-cilinder-wikkelen" },
  textFill: { chapter: "text", de: "kontur-silhouette-und-breiter", en: "outline-silhouette-and-wider", nl: "contour-silhouet-en-breder" },
  textLayers: { chapter: "text", de: "schichten-und-namensschilder", en: "layers-and-name-tags", nl: "lagen-en-naambordjes" },
  iconTag: { chapter: "text", de: "symbolschilder", en: "icon-tags", nl: "icoonbordjes" },
  myShapes: { chapter: "shapes", de: "eigene-formen", en: "custom-shapes", nl: "eigen-vormen" },
  objectList: { chapter: "select", de: "die-objektliste", en: "the-object-list", nl: "de-objectlijst" },
  pattern: { chapter: "select", de: "muster-reihe-und-kreis", en: "patterns-row-and-circle", nl: "patronen-rij-en-cirkel" },
  holePattern: { chapter: "select", de: "lochmuster-auf-einer-flaeche", en: "hole-pattern-on-a-face", nl: "gatenpatroon-op-een-vlak" },
  scaleByPercent: { chapter: "select", de: "um-prozent-skalieren", en: "scaling-by-percent", nl: "schalen-in-procenten" },
  selectionProperties: { chapter: "select", de: "mehrere-teile-auf-einmal-aendern", en: "changing-several-parts-at-once", nl: "meerdere-onderdelen-tegelijk-veranderen" },
  historyView: { chapter: "select", de: "zurueckschauen-die-verlaufsansicht", en: "looking-back-the-history-view", nl: "terugkijken-de-geschiedenisweergave" },
  grouping: { chapter: "solids", de: "gruppieren", en: "grouping", nl: "groeperen" },
  bundling: { chapter: "solids", de: "buendeln", en: "bundling", nl: "bundelen" },
  intersection: { chapter: "solids", de: "schnittmenge", en: "intersection", nl: "doorsnijding" },
  splitting: { chapter: "solids", de: "teilen", en: "splitting", nl: "splitsen" },
  edgeTreatment: { chapter: "edges", de: "kanten-fasen-und-verrunden", en: "chamfering-and-filleting-edges", nl: "randen-afschuinen-en-afronden" },
  hollowing: { chapter: "edges", de: "koerper-aushoehlen", en: "hollowing-bodies", nl: "lichamen-uithollen" },
  threads: { chapter: "threads", de: "gewinde", en: "threads", nl: "schroefdraad" },
  gears: { chapter: "threads", de: "zahnraeder", en: "gears", nl: "tandwielen" },
  springs: { chapter: "threads", de: "federn", en: "springs", nl: "veren" },
  bentTubes: { chapter: "threads", de: "gebogene-rohre", en: "bent-tubes", nl: "gebogen-buizen" },
  loft: { chapter: "threads", de: "uebergang", en: "loft", nl: "loft" },
  hinge: { chapter: "threads", de: "scharnier", en: "hinge", nl: "scharnier" },
  knurl: { chapter: "threads", de: "raendelung", en: "knurling", nl: "kartel" },
  dovetail: { chapter: "threads", de: "schwalbenschwanz", en: "dovetail", nl: "zwaluwstaart" },
  teardrop: { chapter: "threads", de: "tropfenbohrung", en: "teardrop-hole", nl: "druppelgat" },
  screwHoles: { chapter: "threads", de: "stufen-und-senkbohrung", en: "counterbore-and-countersink", nl: "verzinkboring-en-verzinking" },
  ruler: { chapter: "measuring", de: "das-lineal", en: "the-ruler", nl: "de-liniaal" },
  printer: { chapter: "printing", de: "den-drucker-waehlen", en: "choosing-your-printer", nl: "je-printer-kiezen" },
  backingUp: { chapter: "files", de: "sichern-und-weitergeben", en: "backing-up-and-passing-on", nl: "back-up-maken-en-doorgeven" },
  exporting: { chapter: "files", de: "exportieren", en: "exporting", nl: "exporteren" },
  importing: { chapter: "files", de: "importieren", en: "importing", nl: "importeren" },
  simplifyMesh: { chapter: "files", de: "ein-importiertes-netz-vereinfachen", en: "simplifying-an-imported-mesh", nl: "een-geimporteerde-mesh-vereenvoudigen" },
  tapeMeasure: { chapter: "measuring", de: "das-massband", en: "the-tape-measure", nl: "het-meetlint" },
  notes: { chapter: "measuring", de: "notizen", en: "notes", nl: "notities" },
  sketchCorners: { chapter: "sketches", de: "ecken-runden-oder-fasen", en: "rounding-or-chamfering-corners", nl: "hoeken-afronden-of-afschuinen" },
  sketchImage: { chapter: "sketches", de: "ein-bild-als-vorlage", en: "a-picture-as-template", nl: "een-afbeelding-als-sjabloon" },
  sketchStroke: { chapter: "sketches", de: "als-kontur-bauen", en: "building-as-a-stroke", nl: "als-lijn-opbouwen" },
  customFonts: { chapter: "text", de: "eigene-schriften", en: "your-own-fonts", nl: "je-eigen-lettertypen" },
  sketchFill: { chapter: "sketches", de: "fuellung-und-silhouette", en: "fill-and-silhouette", nl: "vulling-en-silhouet" },
  sketchDrawing: { chapter: "sketches", de: "zeichnen", en: "drawing", nl: "tekenen" },
  sketchToBody: { chapter: "sketches", de: "ein-koerper-daraus-machen", en: "making-a-body-from-it", nl: "er-een-lichaam-van-maken" },
  addShape: { chapter: "shapes", de: "eine-form-hinzufuegen", en: "adding-a-shape", nl: "een-vorm-toevoegen" },
  selecting: { chapter: "select", de: "auswaehlen", en: "selecting", nl: "selecteren" },
  layFlat: { chapter: "select", de: "auf-eine-flaeche-legen", en: "laying-flat-on-a-face", nl: "plat-op-een-vlak-leggen" },
  referencePoints: { chapter: "measuring", de: "bezugspunkte", en: "reference-points", nl: "referentiepunten" },
  addingText: { chapter: "text", de: "text-hinzufuegen", en: "adding-text", nl: "tekst-toevoegen" },
  sketchCurve: { chapter: "sketches", de: "eine-gerade-seite-kruemmen", en: "curving-a-straight-side", nl: "een-rechte-zijde-buigen" },
  commandSearch: { chapter: "shortcuts", de: "befehlssuche", en: "command-search", nl: "opdrachten-zoeken" },
  whatsNew: { chapter: "start", de: "neu-seit-deinem-letzten-besuch", en: "new-since-your-last-visit", nl: "nieuw-sinds-je-laatste-bezoek" },
} as const satisfies Record<string, { chapter: GuideChapter; en: string } & Partial<Record<Language, string>>>;

export type GuideSection = keyof typeof GUIDE_SECTIONS;

/** The address of a chapter or one of its sections, or of the guide's overview when neither is named. */
export function guideHref(language: Language, chapter?: GuideChapter, section?: GuideSection): string {
  const directory = LANGUAGE_INFO[language].guideDir;
  const target = section ? GUIDE_SECTIONS[section] : null;
  const page = target?.chapter ?? chapter;
  if (!page) return `/${directory}/index.html`;
  // A language without names of its own in the tables above names its chapters like the English
  // ones, and a chapter it has not translated shows the English text under that same name.
  const chapterSlug = (GUIDE_CHAPTERS[page] as { en: string } & Partial<Record<Language, string>>)[language] ?? GUIDE_CHAPTERS[page].en;
  const anchor = target ? (target as { en: string } & Partial<Record<Language, string>>)[language] ?? target.en : null;
  return `/${directory}/${chapterSlug}.html${anchor ? `#${anchor}` : ""}`;
}

/**
 * Where in its chapter a shape is explained - the heading its question mark
 * jumps to. Text and sketches have a chapter of their own and open its top.
 */
type GuideShape = {
  kind: ShapeKind;
  groupedShapes?: readonly unknown[];
  groupOperation?: string;
  sketchProfile?: unknown;
  sketchOperation?: string;
  importedMesh?: { sourceFormat?: string };
  layeredText?: boolean;
  layeredIcon?: boolean;
};

export function guideSectionForShape(shape: GuideShape): GuideSection | undefined {
  // A name tag (#215) is a bundle, but its panel is explained with the text.
  if (shape.layeredText && shape.groupedShapes?.length) return "textLayers";
  // An icon tag is a bundle too; its card is explained next to the name tag.
  if (shape.layeredIcon && shape.groupedShapes?.length) return "iconTag";
  if (shape.groupedShapes?.length) {
    if (shape.groupOperation === "bundle") return "bundling";
    if (shape.groupOperation === "intersection") return "intersection";
    return "grouping";
  }
  // A body made from a sketch, or a file brought in, is explained where it was made.
  // An extruded one shows its fill in the properties (#197); a revolved one, how it was made.
  if (shape.sketchProfile) return shape.sketchOperation === "revolve" ? "sketchToBody" : "sketchFill";
  if (shape.kind === "mesh" && shape.importedMesh && shape.importedMesh.sourceFormat !== "json") return "importing";
  switch (shape.kind) {
    case "text":
      return "addingText";
    case "sketch":
    case "scribble":
      return "sketchToBody";
    case "thread":
      return "threads";
    case "gear":
      return "gears";
    case "spring":
      return "springs";
    case "bentTube":
      return "bentTubes";
    case "loft":
      return "loft";
    case "honeycomb":
      // No longer a shape of its own: the hole pattern tool took its place (#223).
      return "holePattern";
    case "hinge":
      return "hinge";
    case "knurl":
      return "knurl";
    case "dovetail":
      return "dovetail";
    case "teardrop":
      return "teardrop";
    case "counterbore":
    case "countersink":
      return "screwHoles";
    case "ruler":
      return "ruler";
    default:
      return "shapeSettings";
  }
}

/** Which chapter explains a shape - the one its question mark opens. */
export function guideChapterForShape(shape: GuideShape): GuideChapter {
  // The chapter always matches the section the question mark jumps to.
  const section = guideSectionForShape(shape);
  if (section) return GUIDE_SECTIONS[section].chapter;
  if (shape.groupedShapes?.length) return "solids";
  switch (shape.kind) {
    case "text":
      return "text";
    case "thread":
    case "spring":
    case "gear":
    case "bentTube":
    case "loft":
    case "hinge":
    case "knurl":
    case "dovetail":
    case "teardrop":
    case "counterbore":
    case "countersink":
      return "threads";
    case "ruler":
      return "measuring";
    case "sketch":
    case "scribble":
      return "sketches";
    default:
      return "shapes";
  }
}
