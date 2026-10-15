/**
 * Which file on the server a save goes to, and whether it overwrites the one
 * the project was opened from.
 *
 * This used to be decided inline by comparing the export name with the project
 * name, which quietly stopped working the moment the two differed - and a file
 * name never equals a project name, because one of them carries the extension.
 * The automatic save passed a file name, every save was therefore taken for a
 * new project, and the server refused each one. Nothing about that was visible
 * in the code, so the decision lives here where a test can pin it down.
 */

export type SharedProjectBinding = { fileName: string; revision: string } | undefined;

export type SharedProjectSaveTarget = {
  /** The name to write under. */
  fileName: string;
  /** True when this replaces the file the project came from, using its revision. */
  saveBackToSource: boolean;
};

export function sharedProjectSaveTarget(input: {
  projectName: string;
  exportName: string;
  binding: SharedProjectBinding;
  /** Set by callers that know the file to write - the automatic save does. */
  targetFileName?: string;
}): SharedProjectSaveTarget {
  const exportName = input.exportName.trim() || input.projectName;
  const saveBackToSource = Boolean(input.binding && (input.targetFileName
    ? input.targetFileName === input.binding.fileName
    : exportName === input.projectName));
  const fileName = saveBackToSource && input.binding
    ? input.binding.fileName
    : `${exportName.replace(/\.(lyl|skf)$/i, "")}.lyl`;
  return { fileName, saveBackToSource };
}
