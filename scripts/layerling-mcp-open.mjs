import { spawn } from "node:child_process";

/**
 * Opening an editor tab for the AI client (#250). The editor is a page in a browser, so the MCP
 * server can start one when none is open - but only on this computer: for a copy on a NAS or
 * server the browser that would show it is not here.
 */

/** Whether the bridge is on this computer, the only place a browser can be started for it. */
export function isLocalBridgeUrl(value) {
  try {
    const host = new URL(value).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  } catch {
    return false;
  }
}

/** The address of a new editor tab. */
export function editorUrl(baseUrl) {
  return new URL("/?editor=1", baseUrl).toString();
}

/** The command that opens `url` in the default browser on this platform. */
export function openCommand(platform, url) {
  if (platform === "win32") return { command: "cmd.exe", args: ["/c", "start", "", url] };
  if (platform === "darwin") return { command: "open", args: [url] };
  return { command: "xdg-open", args: [url] };
}

/** Starts the default browser on `url` and does not wait for it. */
export function openInDefaultBrowser(url, platform = process.platform) {
  const { command, args } = openCommand(platform, url);
  const child = spawn(command, args, { stdio: "ignore", detached: true, windowsHide: true });
  child.on("error", () => {});
  child.unref();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens an editor tab and waits until one that was not there before has connected. `listEditors`
 * returns the connected editors ({ editors: [...] }), `open` starts the browser.
 */
export async function openEditorAndWait({ baseUrl, listEditors, open = openInDefaultBrowser, wait = sleep, timeoutMs = 45000, stepMs = 1000 }) {
  if (!isLocalBridgeUrl(baseUrl)) {
    throw new Error(`Layerling at ${baseUrl} is not on this computer, so no editor can be opened from here. Open one in your browser at that address.`);
  }
  const before = new Set(((await listEditors()).editors ?? []).map((editor) => editor.editorNumber));
  open(editorUrl(baseUrl));
  for (let waited = 0; waited <= timeoutMs; waited += stepMs) {
    await wait(stepMs);
    const { editors = [] } = await listEditors();
    const fresh = editors.find((editor) => !before.has(editor.editorNumber));
    if (fresh) return { opened: true, editor: fresh, editors };
  }
  throw new Error(`The editor tab did not connect within ${Math.round(timeoutMs / 1000)} s. Open ${editorUrl(baseUrl)} in your browser yourself.`);
}
