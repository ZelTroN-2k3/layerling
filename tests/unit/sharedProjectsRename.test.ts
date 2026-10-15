import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/shared-projects/route";

/*
 * A project that is renamed in the editor gets its file renamed on the server too (#265): the
 * overview shows the file name, so it would keep the old name for good otherwise. The file is
 * only renamed - same bytes, same revision, its picture goes along.
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

async function createThumbnail(fileName: string, revision: string, folder = "") {
  const thumbnails = path.join(sharedProjectsRoot, folder, THUMBNAILS_DIRECTORY);
  await fs.mkdir(thumbnails, { recursive: true });
  await fs.writeFile(path.join(thumbnails, `${fileName}.${revision}.png`), "picture");
}

function renameRequest(fileName: string, renameFileTo: string, revision?: string, options: { folder?: string; origin?: string } = {}) {
  const headers = new Headers({ Origin: options.origin ?? "http://localhost" });
  if (revision) headers.set("If-Match", `"${revision}"`);
  const query = new URLSearchParams({ fileName, renameFileTo });
  if (options.folder) query.set("path", options.folder);
  return new Request(`http://localhost/api/shared-projects?${query.toString()}`, { method: "POST", headers });
}

describe("renaming the file of a shared project", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shared-rename-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;
    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("renames the file and keeps its bytes", async () => {
    const project = await createSharedProject("Unbekannter Entwurf 13.lyl", "the bytes");

    const response = await POST(renameRequest(project.fileName, "Neuer Name", project.revision));

    expect(response.status).toBe(200);
    const payload = await response.json() as { project: { fileName: string; name: string; revision: string }; renamedFrom: string };
    expect(payload.project.fileName).toBe("Neuer Name.lyl");
    expect(payload.project.name).toBe("Neuer Name");
    expect(payload.renamedFrom).toBe("Unbekannter Entwurf 13.lyl");
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Neuer Name.lyl"), "utf8")).toBe("the bytes");
    await expect(fs.access(path.join(sharedProjectsRoot, "Unbekannter Entwurf 13.lyl"))).rejects.toThrow();
  });

  it("answers with a revision the next save can use, and the overview shows the new name only", async () => {
    const project = await createSharedProject("Alt.lyl");

    const response = await POST(renameRequest(project.fileName, "Neu", project.revision));
    const payload = await response.json() as { project: { fileName: string; revision: string } };

    expect((await listProject("Neu.lyl")).revision).toBe(payload.project.revision);
    await expect(listProject("Alt.lyl")).rejects.toThrow();
  });

  it("takes the picture along", async () => {
    const project = await createSharedProject("Alt.lyl");
    await createThumbnail(project.fileName, project.revision);

    const response = await POST(renameRequest(project.fileName, "Neu", project.revision));
    const payload = await response.json() as { project: { fileName: string; revision: string; thumbnailUrl?: string } };

    expect(payload.project.thumbnailUrl).toBeTruthy();
    const picture = path.join(sharedProjectsRoot, THUMBNAILS_DIRECTORY, `Neu.lyl.${payload.project.revision}.png`);
    expect(await fs.readFile(picture, "utf8")).toBe("picture");
    await expect(fs.access(path.join(sharedProjectsRoot, THUMBNAILS_DIRECTORY, `Alt.lyl.${project.revision}.png`))).rejects.toThrow();
  });

  it("renames inside the folder the project lives in", async () => {
    const project = await createSharedProject("Alt.lyl", "in a folder", "Halterungen");

    const response = await POST(renameRequest(project.fileName, "Neu", project.revision, { folder: "Halterungen" }));

    expect(response.status).toBe(200);
    await expect(fs.access(path.join(sharedProjectsRoot, "Halterungen", "Neu.lyl"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(sharedProjectsRoot, "Neu.lyl"))).rejects.toThrow();
  });

  it("refuses a name that is already taken instead of overwriting it", async () => {
    const project = await createSharedProject("Alt.lyl", "mine");
    await createSharedProject("Neu.lyl", "somebody else's work");

    const response = await POST(renameRequest(project.fileName, "Neu", project.revision));

    expect(response.status).toBe(409);
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Neu.lyl"), "utf8")).toBe("somebody else's work");
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Alt.lyl"), "utf8")).toBe("mine");
  });

  it("refuses the name the project already has", async () => {
    const project = await createSharedProject("Alt.lyl");

    const response = await POST(renameRequest(project.fileName, "Alt", project.revision));

    expect(response.status).toBe(409);
  });

  it("refuses a stale revision and requires one", async () => {
    const project = await createSharedProject("Alt.lyl");

    expect((await POST(renameRequest(project.fileName, "Neu", "stale-revision"))).status).toBe(409);
    expect((await POST(renameRequest(project.fileName, "Neu"))).status).toBe(428);
    await expect(fs.access(path.join(sharedProjectsRoot, "Neu.lyl"))).rejects.toThrow();
  });

  it("refuses a foreign origin", async () => {
    const project = await createSharedProject("Alt.lyl");

    const response = await POST(renameRequest(project.fileName, "Neu", project.revision, { origin: "http://evil.example" }));

    expect(response.status).toBe(403);
  });

  it("does not take a name that leaves the folder", async () => {
    const project = await createSharedProject("Alt.lyl");

    await POST(renameRequest(project.fileName, "../Draussen", project.revision));

    await expect(fs.access(path.join(path.dirname(sharedProjectsRoot), "Draussen.lyl"))).rejects.toThrow();
  });
});
