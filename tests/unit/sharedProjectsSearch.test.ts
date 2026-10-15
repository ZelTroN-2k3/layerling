import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/shared-projects/route";

/*
 * Eine Auflistung zeigt einen Ordner. Wer sucht, weiss aber gerade nicht, in
 * welchem Ordner etwas liegt - deshalb geht die Suche ueber den ganzen Baum und
 * schreibt zu jedem Treffer, wo er steht. Daran haengt die Trefferliste in der
 * Uebersicht: Ohne den Ordner waere sie eine Sackgasse.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";

let sharedProjectsRoot = "";
let previousSharedProjectsRoot: string | undefined;

type SearchPayload = {
  search?: string;
  truncated?: boolean;
  projects: Array<{ fileName: string; name: string; path: string }>;
  folders: Array<{ name: string; path: string; projects?: number; folders?: number }>;
};

async function writeProject(folder: string, fileName: string) {
  await fs.mkdir(path.join(sharedProjectsRoot, folder), { recursive: true });
  await fs.writeFile(path.join(sharedProjectsRoot, folder, fileName), "shared project");
}

async function search(term: string, extra = "") {
  const response = await GET(new Request(`http://localhost/api/shared-projects?search=${encodeURIComponent(term)}${extra}`));
  expect(response.status).toBe(200);
  return await response.json() as SearchPayload;
}

describe("searching the whole store", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shared-search-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;
    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("finds a design in a subfolder and says which folder holds it", async () => {
    await writeProject("Halterungen/Regal", "Winkel.lyl");

    const payload = await search("winkel");

    expect(payload.projects).toHaveLength(1);
    expect(payload.projects[0].name).toBe("Winkel");
    expect(payload.projects[0].path).toBe("Halterungen/Regal");
  });

  it("finds a design at the top as well, with an empty folder", async () => {
    await writeProject("", "Winkel.lyl");

    const payload = await search("winkel");

    expect(payload.projects[0].path).toBe("");
  });

  it("finds folders by name and says where they are", async () => {
    await fs.mkdir(path.join(sharedProjectsRoot, "Halterungen", "Halter klein"), { recursive: true });
    await writeProject("Halterungen/Halter klein", "Winkel.lyl");

    const payload = await search("halter");

    expect(payload.folders.map((folder) => [folder.name, folder.path])).toEqual([
      ["Halter klein", "Halterungen"],
      ["Halterungen", ""],
    ]);
    // Die Zaehlung reist mit, damit das Loeschen spaeter sagen kann, was drin liegt.
    expect(payload.folders.find((folder) => folder.name === "Halter klein")?.projects).toBe(1);
  });

  it("does not care where the browser currently stands", async () => {
    await writeProject("Halterungen", "Winkel.lyl");

    // Ein `path` in der Anfrage darf die Suche nicht einengen - sonst waere sie
    // wieder das, was sie vorher war.
    const payload = await search("winkel", "&path=Halterungen");
    const fromElsewhere = await search("winkel");

    expect(payload.projects).toHaveLength(1);
    expect(fromElsewhere.projects).toEqual(payload.projects);
  });

  it("leaves the hidden folders alone", async () => {
    await writeProject("", "Winkel.lyl");
    await fs.mkdir(path.join(sharedProjectsRoot, ".thumbnails"), { recursive: true });
    await fs.writeFile(path.join(sharedProjectsRoot, ".thumbnails", "Winkel.lyl.abc.png"), "picture");

    const payload = await search("winkel");

    expect(payload.projects).toHaveLength(1);
    expect(payload.projects[0].fileName).toBe("Winkel.lyl");
  });

  it("passes over what is not a design", async () => {
    await fs.writeFile(path.join(sharedProjectsRoot, "Winkel.txt"), "not a design");
    await writeProject("", "Winkel.skf");

    const payload = await search("winkel");

    expect(payload.projects.map((project) => project.fileName)).toEqual(["Winkel.skf"]);
  });

  it("matches without regard to case, anywhere in the name", async () => {
    await writeProject("", "Grosser WINKEL fuer Regal.lyl");

    expect((await search("winkel")).projects).toHaveLength(1);
    expect((await search("REGAL")).projects).toHaveLength(1);
    expect((await search("Schraube")).projects).toHaveLength(0);
  });

  it("puts the most recent design first", async () => {
    await writeProject("", "Winkel alt.lyl");
    await new Promise((resolve) => setTimeout(resolve, 12));
    await writeProject("Halterungen", "Winkel neu.lyl");

    const payload = await search("winkel");

    expect(payload.projects.map((project) => project.name)).toEqual(["Winkel neu", "Winkel alt"]);
  });

  it("still lists a folder when nothing is searched for", async () => {
    await writeProject("Halterungen", "Winkel.lyl");

    // Ein leerer Suchbegriff ist keine Suche, sondern die gewohnte Auflistung.
    const response = await GET(new Request("http://localhost/api/shared-projects?search="));
    const payload = await response.json() as { path?: string; folders: Array<{ name: string }>; projects: unknown[] };

    expect(payload.path).toBe("");
    expect(payload.folders.map((folder) => folder.name)).toEqual(["Halterungen"]);
    expect(payload.projects).toHaveLength(0);
  });
});
