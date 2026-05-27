import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a value stored in `file_url` / `docx_url` (which may be either a
 * storage object path or a legacy full public URL) into a short-lived signed
 * URL that works against a private bucket.
 *
 * Returns the original value untouched ONLY for genuinely external URLs (i.e.
 * not Supabase storage). For Supabase storage URLs we always re-sign — never
 * hand back the now-dead `/object/public/...` form.
 */
export async function signFileUrl(
  bucket: string,
  urlOrPath: string,
  expiresInSeconds: number = 60 * 60,
): Promise<string | null> {
  if (!urlOrPath) return null;

  const isHttp = /^https?:\/\//i.test(urlOrPath);
  const isSupabaseStorage = urlOrPath.includes("/storage/v1/object/");

  // Genuinely external link — leave alone.
  if (isHttp && !isSupabaseStorage) return urlOrPath;

  let path = urlOrPath;

  if (isSupabaseStorage) {
    // Try public-URL marker first, then signed-URL marker, for any bucket
    // (not just the one passed in — legacy rows may carry an old bucket name).
    const publicMarker = "/storage/v1/object/public/";
    const signMarker = "/storage/v1/object/sign/";
    const tryExtract = (marker: string) => {
      const idx = path.indexOf(marker);
      if (idx < 0) return null;
      const rest = path.substring(idx + marker.length);
      const slash = rest.indexOf("/");
      if (slash < 0) return null;
      return {
        bucket: rest.substring(0, slash),
        key: rest.substring(slash + 1).split("?")[0],
      };
    };
    const extracted = tryExtract(publicMarker) ?? tryExtract(signMarker);
    if (extracted) {
      // Honor whichever bucket the legacy URL was stored under, but fall back
      // to the caller's bucket when it's clearly the same target.
      bucket = extracted.bucket || bucket;
      path = extracted.key;
    } else {
      console.warn("[signFileUrl] could not parse storage URL:", urlOrPath);
      return null;
    }
  }

  // Legacy URLs may percent-encode characters that the underlying storage key
  // stores literally (e.g. spaces). Decode so the signing request matches.
  try {
    if (/%[0-9A-Fa-f]{2}/.test(path)) path = decodeURIComponent(path);
  } catch {
    /* leave as-is */
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error("[signFileUrl] createSignedUrl failed", { bucket, path, error });
    return null;
  }
  return data.signedUrl;
}
