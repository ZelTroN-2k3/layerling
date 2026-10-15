import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { encodePng } from "./png";

/*
 * Zeichnet die Symbole der Marke aus layerling-icon.svg - dasselbe Bild, das
 * im Browserreiter steht, nur als PNG in den Groessen, die ein SVG nicht
 * abdeckt: iOS nimmt fuer den Home-Bildschirm ausschliesslich PNG, ein
 * Webmanifest verlangt Pixelmasse, und wer im Vorbeigehen /favicon.ico
 * abholt, bekommt sonst einen 404. Aufruf: npm run icons:brand
 *
 * Das SVG bleibt die einzige Quelle. Wer die Marke aendert, aendert sie dort
 * und ruft das hier noch einmal auf - es liest die Rechtecke aus der Datei,
 * statt sie ein zweites Mal zu beschreiben.
 */

type Rect = { x: number; y: number; w: number; h: number; r: number; fill: [number, number, number] };

function parseColour(value: string): [number, number, number] {
  const hex = value.trim().replace("#", "");
  expect(hex, `Farbe ${value} ist kein sechsstelliges Hex`).toMatch(/^[0-9a-fA-F]{6}$/);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * Liest die Rechtecke eines Marken-SVG.
 *
 * Bewusst kein SVG-Leser, sondern eine Behauptung: In diesen beiden Dateien
 * steht nichts als Rechtecke. Kommt eines Tages ein Pfad dazu, faellt das hier
 * auf die Nase - besser, als ihn stillschweigend wegzulassen und ein Symbol
 * auszuliefern, in dem etwas fehlt.
 */
function readBrandSvg(path: string) {
  const source = readFileSync(path, "utf8");
  const view = /viewBox="0 0 (\d+) (\d+)"/.exec(source);
  expect(view, `${path}: viewBox fehlt`).not.toBeNull();
  expect(view![1], `${path}: nur quadratische Symbole`).toBe(view![2]);

  const rects: Rect[] = [];
  for (const match of source.matchAll(/<rect\b([^>]*)\/>/g)) {
    const attribute = (name: string) => {
      const found = new RegExp(`\\b${name}="([^"]*)"`).exec(match[1]);
      return found ? found[1] : null;
    };
    const number = (name: string, fallback = 0) => {
      const raw = attribute(name);
      return raw === null ? fallback : Number(raw);
    };
    const fill = attribute("fill");
    expect(fill, `${path}: ein Rechteck ohne fill`).not.toBeNull();
    rects.push({
      x: number("x"),
      y: number("y"),
      w: number("width"),
      h: number("height"),
      r: number("rx"),
      fill: parseColour(fill!),
    });
  }

  const remainder = source
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<svg\b[^>]*>|<\/svg>/g, "")
    .replace(/<title>[^<]*<\/title>/g, "")
    .replace(/<rect\b[^>]*\/>/g, "")
    .trim();
  expect(remainder, `${path}: da steht mehr als Rechtecke drin`).toBe("");
  expect(rects.length, `${path}: keine Rechtecke gefunden`).toBeGreaterThan(0);

  return { view: Number(view![1]), rects };
}

/** Liegt der Punkt in einem Rechteck mit runden Ecken? */
function inside(rect: Rect, px: number, py: number) {
  if (px < rect.x || py < rect.y || px > rect.x + rect.w || py > rect.y + rect.h) return false;
  const r = Math.min(rect.r, rect.w / 2, rect.h / 2);
  if (r <= 0) return true;
  const cx = Math.min(Math.max(px, rect.x + r), rect.x + rect.w - r);
  const cy = Math.min(Math.max(py, rect.y + r), rect.y + rect.h - r);
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Stellt die Rechtecke mittig in ein Bild, an ihrer eigenen Ausdehnung
 * gemessen statt an der SVG-Flaeche: Im Symbol sitzt das Motiv nicht in der
 * Mitte seines Quadrats, und auf einer breiten Karte faellt das sofort auf.
 */
function placeCentred(rects: Rect[], area: { width: number; height: number }, share: number): Rect[] {
  const left = Math.min(...rects.map((r) => r.x));
  const top = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  const factor = (area.height * share) / (bottom - top);
  const offsetX = (area.width - (right - left) * factor) / 2 - left * factor;
  const offsetY = (area.height - (bottom - top) * factor) / 2 - top * factor;
  return rects.map((rect) => ({
    x: offsetX + rect.x * factor,
    y: offsetY + rect.y * factor,
    w: rect.w * factor,
    h: rect.h * factor,
    r: rect.r * factor,
    fill: rect.fill,
  }));
}

/** Rechnet die Rechtecke aus der SVG-Flaeche in ein Feld des Zielbilds um. */
function place(rects: Rect[], view: number, box: { x: number; y: number; size: number }): Rect[] {
  const factor = box.size / view;
  return rects.map((rect) => ({
    x: box.x + rect.x * factor,
    y: box.y + rect.y * factor,
    w: rect.w * factor,
    h: rect.h * factor,
    r: rect.r * factor,
    fill: rect.fill,
  }));
}

/**
 * Malt die Rechtecke der Reihe nach und tastet dabei mehrfach ab: Die Kanten
 * sind rund, und ohne Ueberabtastung sieht ein 32er Symbol danach aus.
 */
function raster(width: number, height: number, rects: Rect[], ground: [number, number, number] | null) {
  const ss = width <= 256 ? 8 : 4;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sa = 0;
      for (let jy = 0; jy < ss; jy += 1) {
        for (let jx = 0; jx < ss; jx += 1) {
          const px = x + (jx + 0.5) / ss;
          const py = y + (jy + 0.5) / ss;
          let colour = ground;
          for (const rect of rects) if (inside(rect, px, py)) colour = rect.fill;
          if (!colour) continue;
          sr += colour[0];
          sg += colour[1];
          sb += colour[2];
          sa += 1;
        }
      }
      const i = (y * width + x) * 4;
      if (sa === 0) continue;
      out[i] = Math.round(sr / sa);
      out[i + 1] = Math.round(sg / sa);
      out[i + 2] = Math.round(sb / sa);
      out[i + 3] = Math.round((sa / (ss * ss)) * 255);
    }
  }
  return out;
}

/**
 * Ein ICO ist ein Verzeichnis und danach die Bilder - seit Vista duerfen das
 * PNGs sein. Drei Groessen, damit die Datei auch als Verknuepfungssymbol taugt.
 */
function encodeIco(images: { size: number; png: Buffer }[]) {
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(0, 0);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    directory[entry] = image.size >= 256 ? 0 : image.size;
    directory[entry + 1] = image.size >= 256 ? 0 : image.size;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(image.png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.png.length;
  });
  return Buffer.concat([directory, ...images.map((image) => image.png)]);
}

const BRAND = "apps/web/public/assets/layerling";

describe("Marken-Symbole", () => {
  it("zeichnet sie aus dem SVG", () => {
    const icon = readBrandSvg(`${BRAND}/layerling-icon.svg`);

    // Das Rechteck, das die ganze Flaeche deckt, ist der Grund. Fuer Apple und
    // fuer Android muss es randlos sein: Beide schneiden das Symbol selbst
    // zurecht, und runde Ecken auf runden Ecken sehen aus wie ein Versehen.
    const ground = icon.rects.find((r) => r.x === 0 && r.y === 0 && r.w === icon.view && r.h === icon.view);
    expect(ground, "kein deckendes Rechteck als Grund gefunden").toBeDefined();
    const motif = icon.rects.filter((rect) => rect !== ground);

    /** Wie das SVG es zeigt, mit runden Ecken. */
    const asDesigned = (size: number) => raster(size, size, place(icon.rects, icon.view, { x: 0, y: 0, size }), null);

    /** Randloser Grund, das Motiv mittig auf `share` der Hoehe. */
    const fullBleed = (size: number, share: number) =>
      raster(size, size, placeCentred(motif, { width: size, height: size }, share), ground!.fill);

    const write = (name: string, rgba: Uint8Array, width: number, height = width) => {
      const png = encodePng(rgba, width, height);
      writeFileSync(name, png);
      return png;
    };

    // iOS nimmt fuer den Home-Bildschirm nur PNG - ein SVG dort laesst es aus
    // und zeigt stattdessen einen Schnappschuss der Seite. Es legt seine
    // eigene Maske darueber, also randlos.
    write(`${BRAND}/apple-touch-icon.png`, fullBleed(180, 0.58), 180);

    // Fuers Webmanifest: "any" so, wie das Symbol gedacht ist, "maskable" mit
    // Luft bis in die Ecken, weil Android bis auf einen Kreis beschneiden darf.
    write(`${BRAND}/layerling-icon-192.png`, asDesigned(192), 192);
    write(`${BRAND}/layerling-icon-512.png`, asDesigned(512), 512);
    write(`${BRAND}/layerling-icon-maskable-512.png`, fullBleed(512, 0.44), 512);

    // Das Bild fuer Linkvorschauen entsteht nicht hier, sondern in
    // scripts/render-social-card.mjs: Auf der Karte steht Schrift, und dafuer
    // ist ein Browser das richtige Werkzeug.

    // Der Rueckfall fuer alles, was stur /favicon.ico abholt.
    writeFileSync(
      "apps/web/public/favicon.ico",
      encodeIco([16, 32, 48].map((size) => ({ size, png: encodePng(asDesigned(size), size) }))),
    );
  });
});
