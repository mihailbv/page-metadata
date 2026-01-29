import { extractMetadata, parseAndValidateUrl, readBodyWithLimit } from "#metadataUtils";

describe("parseAndValidateUrl", () => {
  test("throws when url is missing", () => {
    expect(() => parseAndValidateUrl(undefined)).toThrow("Missing 'url' query parameter");
  });

  test("throws on invalid URL", () => {
    expect(() => parseAndValidateUrl("not-a-url")).toThrow("Invalid URL");
  });

  test("throws on unsupported protocol", () => {
    expect(() => parseAndValidateUrl("ftp://example.com")).toThrow("Only http/https URLs are supported");
  });

  test("accepts http/https", () => {
    const u = parseAndValidateUrl("https://example.com/path");
    expect(u).toBeInstanceOf(URL);
    expect(u.toString()).toBe("https://example.com/path");
  });
});

describe("readBodyWithLimit", () => {
  test("returns empty string when response has no body", async () => {
    const response = { headers: new Headers(), body: null };
    await expect(readBodyWithLimit(response, 10)).resolves.toBe("");
  });

  test("throws when content-length exceeds maxBytes", async () => {
    const response = {
      headers: new Headers({ "content-length": "11" }),
      body: null,
    };

    await expect(readBodyWithLimit(response, 10)).rejects.toThrow("Response too large");
  });

  test("throws when streamed body exceeds maxBytes", async () => {
    const html = "x".repeat(12);
    const res = new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await expect(readBodyWithLimit(res, 10)).rejects.toThrow("Response too large");
  });

  test("reads full body within limit", async () => {
    const html = "<html><head></head><body>ok</body></html>";
    const res = new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    await expect(readBodyWithLimit(res, 10_000)).resolves.toBe(html);
  });
});

describe("extractMetadata", () => {
  test("extracts common metadata", () => {
    const html = `
      <html>
        <head>
          <title>Doc Title</title>
          <meta name="description" content="Desc" />
          <meta property="og:image" content="/img.png" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="canonical" href="/canonical" />
        </head>
        <body></body>
      </html>
    `;

    const out = extractMetadata(html, "https://example.com/base");

    expect(out.title).toBe("Doc Title");
    expect(out.description).toBe("Desc");
    expect(out.image).toBe("https://example.com/img.png");
    expect(out.favicon).toBe("https://example.com/favicon.ico");
    expect(out.canonicalUrl).toBe("https://example.com/canonical");
  });

  test("prefers og:title over <title>", () => {
    const html = `
      <html>
        <head>
          <title>Doc Title</title>
          <meta property="og:title" content="OG Title" />
        </head>
        <body></body>
      </html>
    `;

    const out = extractMetadata(html, "https://example.com/");
    expect(out.title).toBe("OG Title");
  });
});
