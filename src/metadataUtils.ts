import { load } from "cheerio";

export function parseAndValidateUrl(rawUrl: unknown): URL {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Missing 'url' query parameter");
  }

  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported");
  }

  return u;
}

type ResponseLike = {
  headers: Headers;
  body: ReadableStream<Uint8Array> | null;
};

export async function readBodyWithLimit(response: ResponseLike, maxBytes: number): Promise<string> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error("Response too large");
    }
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error("Response too large");
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }

  return new TextDecoder("utf-8").decode(merged);
}

function pickFirstNonEmpty(values: Array<unknown>): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function resolveMaybeRelativeUrl(href: unknown, base: string): string | null {
  if (!href || typeof href !== "string") return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export type ExtractedMetadata = {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  type: string | null;
  locale: string | null;
  canonicalUrl: string | null;
  favicon: string | null;
};

export function extractMetadata(html: string, baseUrl: string): ExtractedMetadata {
  const $ = load(html);

  const metaByName = (name: string) => $("meta[name='" + name + "']").attr("content");
  const metaByProperty = (prop: string) => $("meta[property='" + prop + "']").attr("content");

  const title = pickFirstNonEmpty([
    metaByProperty("og:title"),
    metaByName("twitter:title"),
    $("title").first().text(),
  ]);

  const description = pickFirstNonEmpty([
    metaByProperty("og:description"),
    metaByName("twitter:description"),
    metaByName("description"),
  ]);

  const image = pickFirstNonEmpty([metaByProperty("og:image"), metaByName("twitter:image")]);

  const siteName = pickFirstNonEmpty([metaByProperty("og:site_name")]);
  const type = pickFirstNonEmpty([metaByProperty("og:type")]);
  const locale = pickFirstNonEmpty([metaByProperty("og:locale")]);

  const canonical = pickFirstNonEmpty([
    metaByProperty("og:url"),
    $("link[rel='canonical']").attr("href"),
  ]);

  const faviconHref = pickFirstNonEmpty([
    $("link[rel='icon']").attr("href"),
    $("link[rel='shortcut icon']").attr("href"),
    $("link[rel='apple-touch-icon']").attr("href"),
  ]);

  const finalBase = canonical ? resolveMaybeRelativeUrl(canonical, baseUrl) ?? baseUrl : baseUrl;

  return {
    title,
    description,
    image: resolveMaybeRelativeUrl(image, finalBase),
    siteName,
    type,
    locale,
    canonicalUrl: resolveMaybeRelativeUrl(canonical, baseUrl),
    favicon: resolveMaybeRelativeUrl(faviconHref, baseUrl),
  };
}
