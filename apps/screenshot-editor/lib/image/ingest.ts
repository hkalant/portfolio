import { useEditorStore } from "@/lib/store/editor";
import { IMAGE_MESSAGES, validateImageFile } from "./accept";
import { ImageLoadError, loadImageFromBlob, type LoadedImage } from "./load";

// Every attempt to bring in an image gets a number. Only the newest attempt may
// change the store, so a slow decode can't overwrite an image added after it.
let latestAttempt = 0;

function messageFor(error: unknown): string {
  if (error instanceof ImageLoadError && error.reason === "tooManyPixels")
    return IMAGE_MESSAGES.tooManyPixels;
  return IMAGE_MESSAGES.unreadable;
}

async function ingest(
  load: () => Promise<LoadedImage>,
  failureMessage?: string,
): Promise<void> {
  const attempt = ++latestAttempt;
  const { setLoading, setImage, showError } = useEditorStore.getState();
  setLoading(true);
  try {
    const image = await load();
    if (attempt !== latestAttempt) {
      image.release();
      return;
    }
    setImage(image);
  } catch (error) {
    if (attempt === latestAttempt)
      showError(failureMessage ?? messageFor(error));
  } finally {
    if (attempt === latestAttempt) setLoading(false);
  }
}

/** Validates and loads a file from the picker, a paste or a drop. Replaces the current image. */
export function ingestFile(file: File): Promise<void> {
  const check = validateImageFile(file);
  if (!check.ok) {
    latestAttempt += 1; // a newer action: drop any load still in flight
    const { setLoading, showError } = useEditorStore.getState();
    setLoading(false);
    showError(check.message);
    return Promise.resolve();
  }
  return ingest(() => loadImageFromBlob(file, file.name));
}

export function ingestSample(
  url: string,
  name = "sample-screenshot.png",
): Promise<void> {
  return ingest(async () => {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Sample image request failed: ${response.status}`);
    return loadImageFromBlob(await response.blob(), name);
  }, IMAGE_MESSAGES.sampleFailed);
}
