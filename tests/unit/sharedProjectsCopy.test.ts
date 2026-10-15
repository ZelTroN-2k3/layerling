import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/shared-projects/route";

/*
 * Duplizieren auf dem Server ist eine Kopie der Datei, kein neues Packen. Die
 * Tests halten deshalb vor allem zwei Dinge fest: dass das Original unberuehrt
 * bleibt und die Kopie Zeichen fuer Zeichen dieselbe ist - und dass die Kopie
 * nichts ueberschreibt, was schon dasteht.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";
const THUMBNAILS_DIRECTORY = ".thumbnails";

let sharedProjectsRoot = "";
let previousSharedProjectsRoot: string | undefined;

async function listProject(fileName: string, folder = "") {
  const query = folder ? `?path=${encodeURIComponent(folder)}` : "";
  const response = await GET(new Request(`http://localhost/api/shared-projects${query}`));
  const payload = await response.json() as { projects: Array<{ fileName: string; revision: string; name: string; thumbnailUrl?: string }> };
  const project = payload.projects.find((candidate) => candidate.fileName === fileName);
  if (!project) throw new Error(`Could not find ${fileName} in the listing`);
  return project;
}

async function createSharedProject(fileName: string, content = "shared project", folder = "") {
  await fs.mkdir(path.join(sharedProjectsRoot, folder), { recursive: true });
  await fs.writeFile(path.join(sharedProjectsRoot, folder, fileName), content);
  return listProject(fileName, folder);
}

/** Das Kartenbild traegt die Revision der Datei im Namen. */
async function createThumbnail(fileName: string, revision: string, folder = "") {
  const thumbnails = path.join(sharedProjectsRoot, folder, THUMBNAILS_DIRECTORY);
  await fs.mkdir(thumbnails, { recursive: true });
  await fs.writeFile(path.join(thumbnails, `${fileName}.${revision}.png`), "picture");
}

function copyRequest(fileName: string, copyTo: string, revision?: string, options: { folder?: string; origin?: string } = {}) {
  const headers = new Headers({ Origin: options.origin ?? "http://localhost" });
  if (revision) headers.set("If-Match", `"${revision}"`);
  const query = new URLSearchParams({ fileName, copyTo });
  if (options.folder) query.set("path", options.folder);
  return new Request(`http://localhost/api/shared-projects?${query.toString()}`, { method: "POST", headers });
}

describe("duplicating a shared project", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shared-copy-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;
    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("writes a copy beside the original and leaves it untouched", async () => {
    const project = await createSharedProject("Halter.lyl", "the original bytes");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));

    expect(response.status).toBe(201);
    const payload = await response.json() as { project: { fileName: string; name: string }; copiedFrom: string };
    expect(payload.project.fileName).toBe("Halter (copy).lyl");
    expect(payload.project.name).toBe("Halter (copy)");
    expect(payload.copiedFrom).toBe("Halter.lyl");
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Halter (copy).lyl"), "utf8")).toBe("the original bytes");
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Halter.lyl"), "utf8")).toBe("the original bytes");
  });

  it("copies inside the folder the original lives in", async () => {
    const project = await createSharedProject("Halter.lyl", "in a folder", "Halterungen");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", project.revision, { folder: "Halterungen" }));

    expect(response.status).toBe(201);
    const payload = await response.json() as { project: { path: string } };
    expect(payload.project.path).toBe("Halterungen");
    await expect(fs.access(path.join(sharedProjectsRoot, "Halterungen", "Halter (copy).lyl"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(sharedProjectsRoot, "Halter (copy).lyl"))).rejects.toThrow();
  });

  it("takes the picture along under the copy's own revision", async () => {
    const project = await createSharedProject("Halter.lyl");
    await createThumbnail(project.fileName, project.revision);

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));
    const payload = await response.json() as { project: { fileName: string; revision: string; thumbnailUrl?: string } };

    expect(payload.project.thumbnailUrl).toBeTruthy();
    const picture = path.join(sharedProjectsRoot, THUMBNAILS_DIRECTORY, `${payload.project.fileName}.${payload.project.revision}.png`);
    expect(await fs.readFile(picture, "utf8")).toBe("picture");
    // Das Bild des Originals bleibt, wo es war.
    await expect(fs.access(path.join(sharedProjectsRoot, THUMBNAILS_DIRECTORY, `Halter.lyl.${project.revision}.png`))).resolves.toBeUndefined();
  });

  it("refuses a name that is already taken instead of overwriting it", async () => {
    const project = await createSharedProject("Halter.lyl", "the original bytes");
    await createSharedProject("Halter (copy).lyl", "somebody else's work");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));

    expect(response.status).toBe(409);
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Halter (copy).lyl"), "utf8")).toBe("somebody else's work");
  });

  it("refuses to copy a project onto itself", async () => {
    const project = await createSharedProject("Halter.lyl");

    const response = await POST(copyRequest(project.fileName, "Halter", project.revision));

    expect(response.status).toBe(409);
  });

  it("refuses a stale revision", async () => {
    const project = await createSharedProject("Halter.lyl");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", "stale-revision"));

    expect(response.status).toBe(409);
    await expect(fs.access(path.join(sharedProjectsRoot, "Halter (copy).lyl"))).rejects.toThrow();
  });

  it("requires a revision precondition before copying", async () => {
    const project = await createSharedProject("Halter.lyl");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)"));

    expect(response.status).toBe(428);
    await expect(fs.access(path.join(sharedProjectsRoot, "Halter (copy).lyl"))).rejects.toThrow();
  });

  it("rejects cross-origin copies", async () => {
    const project = await createSharedProject("Halter.lyl");

    const response = await POST(copyRequest(project.fileName, "Halter (copy)", project.revision, { origin: "https://example.invalid" }));

    expect(response.status).toBe(403);
    await expect(fs.access(path.join(sharedProjectsRoot, "Halter (copy).lyl"))).rejects.toThrow();
  });

  it("leaves no lock files behind, whether it worked or not", async () => {
    const project = await createSharedProject("Halter.lyl");
    await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));
    await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));

    const leftovers = (await fs.readdir(sharedProjectsRoot)).filter((entry) => entry.endsWith(".lock"));
    expect(leftovers).toEqual([]);
  });

  it("lists the copy as a design of its own", async () => {
    const project = await createSharedProject("Halter.lyl");
    await POST(copyRequest(project.fileName, "Halter (copy)", project.revision));

    const copy = await listProject("Halter (copy).lyl");
    expect(copy.name).toBe("Halter (copy)");
  });
});
