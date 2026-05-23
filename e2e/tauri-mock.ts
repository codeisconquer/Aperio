import type { Page } from "@playwright/test";

/**
 * Installs a minimal Tauri IPC shim so the Vite dev UI can run in Playwright
 * (headless Chromium) without the native webview — the CI-friendly pattern
 * recommended for Tauri v2 when WebDriver is unavailable (e.g. macOS desktop).
 */
export async function installTauriMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { isTauri?: boolean }).isTauri = true;

    (window as Window & { __TAURI_EVENT_PLUGIN_INTERNALS__?: unknown }).__TAURI_EVENT_PLUGIN_INTERNALS__ =
      {
        unregisterListener: () => undefined,
      };

    const handlers: Record<
      string,
      (args: Record<string, unknown>) => unknown
    > = {
      get_history: () => [],
      get_environments: () => [],
      list_secure_token_projects_cmd: () => [],
      "plugin:event|listen": () => 1,
      "plugin:event|unlisten": () => null,
      parse_curl_command: (args) => {
        const curl = String(args.curlString ?? "");
        const methodMatch = curl.match(/-X\s+['"]?(\w+)['"]?/i);
        const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";
        const urlMatch = curl.match(/['"](https?:\/\/[^'"]+)['"]/);
        const url = urlMatch?.[1] ?? "";
        const headers: Record<string, string> = {};
        const headerRegex = /-H\s+['"]([^:'"]+):\s*([^'"]+)['"]/gi;
        let match: RegExpExecArray | null;
        while ((match = headerRegex.exec(curl)) !== null) {
          headers[match[1].trim()] = match[2].trim();
        }
        const dataMatch = curl.match(/-d\s+['"]([^'"]*)['"]/s);
        const body = dataMatch ? dataMatch[1] : null;
        return { method, url, headers, body };
      },
      send_request: (args) => {
        const payload = (args.payload ?? args) as Record<string, unknown>;
        return {
          status: 200,
          body: JSON.stringify({
            ok: true,
            method: payload.method,
            url: payload.url,
          }),
          headers: { "content-type": "application/json" },
          duration_ms: 42,
        };
      },
    };

    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {
      invoke: (cmd: string, args: Record<string, unknown> = {}) => {
        const handler = handlers[cmd];
        if (!handler) {
          return Promise.reject(new Error(`Unhandled Tauri invoke: ${cmd}`));
        }
        return Promise.resolve(handler(args));
      },
      transformCallback: () => 1,
    };
  });
}
