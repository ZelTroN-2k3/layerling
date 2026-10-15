import { afterEach, describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { ERROR_RULES, localizedError, looksEnglish } from "@/lib/userErrors";
import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN } from "@/lib/messages.en";

describe("error messages for people", () => {
  afterEach(() => setLanguage("en"));

  it("shows known English error texts in German", () => {
    setLanguage("de");
    expect(localizedError("The stored CAD feature could not be restored as a valid solid")).toBe(MESSAGES_DE["error.storedBodyRestore"]);
    expect(localizedError("The chosen size does not leave a closed solid")).toBe(MESSAGES_DE["edge.errorNoSolidResult"]);
    expect(localizedError("SVG is too large. The maximum supported size is 5 MB")).toContain("5 MB");
    expect(localizedError("OBJ contains a degenerate face")).toBe(MESSAGES_DE["error.objBroken"]);
  });

  it("shows the refusals of the drawing export in German", () => {
    setLanguage("de");
    expect(localizedError("This drawing has more than 200 circular holes. Select a smaller part.")).toBe(MESSAGES_DE["error.drawingTooManyHoles"]);
    expect(localizedError("The 1:1 drawing exceeds 5,080 mm. Select a smaller part.")).toBe(MESSAGES_DE["error.drawingTooLarge"]);
    expect(localizedError("Drawing views support up to 100,000 triangles. Choose fewer or simpler objects.")).toBe(MESSAGES_DE["error.drawingTooManyTriangles"]);
    expect(localizedError("This view has too many drawing edges. Choose fewer or simpler objects.")).toBe(MESSAGES_DE["error.drawingTooManyEdges"]);
    expect(localizedError("This view has no solid geometry")).toBe(MESSAGES_DE["error.drawingNoGeometry"]);
  });

  it("translates the texts of the server routes, with the folder and setting kept", () => {
    setLanguage("de");
    expect(localizedError("That folder name is not allowed")).toBe(MESSAGES_DE["error.folderNameNotAllowed"]);
    expect(localizedError("This shared project is currently being changed by someone else")).toBe(MESSAGES_DE["error.sharedBusy"]);
    const made = localizedError("The shared folder /data from LAYERLING_SHARED_PROJECTS_DIR cannot be created (EACCES: permission denied, mkdir '/data'). Mount a writable folder at /data, or set LAYERLING_SHARED_PROJECTS_DIR to the folder you mounted. In Docker, apply a changed setting with \"docker compose up -d\"; \"restart\" keeps the old one.");
    expect(made).toContain("/data");
    expect(made).toContain("LAYERLING_SHARED_PROJECTS_DIR");
    expect(made).toContain("EACCES");
    expect(made).toContain("docker compose up -d");
    expect(made).not.toContain("Mount a writable");
  });

  it("puts a German sentence around an unknown English text, and leaves German alone", () => {
    setLanguage("de");
    expect(localizedError("Something unexpected could not be written")).toContain("Technische Angabe");
    expect(localizedError("Der Entwurf ließ sich nicht speichern.")).toBe("Der Entwurf ließ sich nicht speichern.");
  });

  it("shows English texts in English", () => {
    setLanguage("en");
    expect(localizedError("The stored CAD feature could not be restored as a valid solid")).toBe(MESSAGES_EN["error.storedBodyRestore"]);
    expect(localizedError("Something unexpected could not be written")).toBe("Something unexpected could not be written");
  });

  it("has a German and an English text for every rule", () => {
    for (const rule of ERROR_RULES) {
      expect(MESSAGES_DE[rule.key], rule.key).toBeTruthy();
      expect(MESSAGES_EN[rule.key], rule.key).toBeTruthy();
    }
  });
});

describe("a raw English text in a language without a word list of its own", () => {
  it("reads plain English as English, and nothing else", () => {
    expect(looksEnglish("The kernel could not build the body.")).toBe(true);
    expect(looksEnglish("This file has no valid contours")).toBe(true);
    expect(looksEnglish("Der Körper konnte nicht gebaut werden")).toBe(false);
    expect(looksEnglish("Не удалось построить тело")).toBe(false);
    expect(looksEnglish("Fehler")).toBe(false);
    expect(looksEnglish("no")).toBe(false);
  });

  it("is left alone in English, and wrapped in German as before", () => {
    setLanguage("en", false);
    expect(localizedError("Something odd happened in the kernel")).toBe("Something odd happened in the kernel");
    setLanguage("de", false);
    expect(localizedError("Something odd happened in the kernel")).toContain("Something odd happened in the kernel");
    expect(localizedError("Something odd happened in the kernel")).not.toBe("Something odd happened in the kernel");
  });
});
