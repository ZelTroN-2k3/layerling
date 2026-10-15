/**
 * Two ways to the same shared folder. The Node build answers on its own route;
 * an installation served as plain files has no route, so it asks store.php,
 * which speaks the same JSON. The path stays relative because the app may be
 * served from a sub-directory.
 */
export const SHARED_PROJECTS_ENDPOINT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "store.php" : "/api/shared-projects";
