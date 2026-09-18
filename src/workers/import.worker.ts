import { parseExport } from "../lib/import";
self.onmessage = async (e: MessageEvent<string>) => {
  try {
    self.postMessage({ preview: await parseExport(e.data) });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Unable to read this file.",
    });
  }
};
