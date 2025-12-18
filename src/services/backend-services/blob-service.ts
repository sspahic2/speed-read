import { put } from "@vercel/blob";

/**
 * Ensure a per-user folder exists in Vercel Blob by writing a small marker object.
 * Folder names in Blob are path prefixes, so we create "<userId>/.keep".
 */
export async function ensureUserFolder(userId: string) {
  if (!userId) {
    throw new Error("User ID is required to create blob folder.");
  }

  const key = `${userId}/.keep`;

  await put(key, " ", { access: "public", allowOverwrite: true });

  return { path: `${userId}/` };
}

export async function uploadJsonToBlob(key: string, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  const result = await put(key, body, { access: "public", contentType: "application/json" });
  return { key: result.url ?? key, url: result.url, pathname: result.pathname };
}

function buildBlobUrl(keyOrUrl: string) {
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
  const base =
    process.env.BLOB_PUBLIC_BASE_URL ||
    process.env.BLOB_BASE_URL ||
    "https://blob.vercel-storage.com";
  return `${base.replace(/\/+$/, "")}/${keyOrUrl.replace(/^\/+/, "")}`;
}

export async function downloadJsonFromBlob(keyOrUrl: string) {
  if (!keyOrUrl) throw new Error("Blob URL is required to download JSON.");
  const target = buildBlobUrl(keyOrUrl);
  console.log({target});
  const res = await fetch(target);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to download blob (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}
