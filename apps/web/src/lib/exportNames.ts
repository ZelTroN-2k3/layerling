export type ProjectExportFormat = "stl" | "3mf" | "obj" | "step" | "svg" | "pdf" | "png" | "lyl" | "zip";

export function projectExportFileName(projectName: string, format: ProjectExportFormat) {
  const safeProjectName = projectName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  return `${safeProjectName || "layerling design"}.${format}`;
}

/**
 * Whether the name typed in the export window asks for a file of its own although the design is
 * linked to an STL file already. Without this the name field did nothing once the first STL had
 * been saved: every later export went into the linked file, whatever was typed (a model and its
 * liner exported one after the other ended up in the same file - reported by mail, 15.10.2026). The name the window starts
 * with, the project name, and the name of the linked file itself keep writing into the link.
 */
export function stlNameAsksForNewFile(typedName: string, projectName: string, linkedFileName: string | null | undefined) {
  if (!linkedFileName) return false;
  const fileOf = (name: string) => projectExportFileName(name.trim().replace(/\.stl$/i, ""), "stl").toLowerCase();
  const typed = fileOf(typedName);
  return typed !== fileOf(projectName) && typed !== linkedFileName.toLowerCase();
}
