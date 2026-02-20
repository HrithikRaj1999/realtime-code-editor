import { useEffect } from "react";

const DEFAULT_SITE_URL = "https://www.techieraj.online";
const DEFAULT_IMAGE_PATH = "/social-preview.svg";
const SEO_JSON_LD_SELECTOR = 'script[type="application/ld+json"][data-seo-managed="true"]';

type JsonLdEntry = Record<string, unknown>;

export interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  robots?: string;
  keywords?: string[];
  imagePath?: string;
  ogType?: "website" | "article";
  jsonLd?: JsonLdEntry | JsonLdEntry[];
}

function toAbsoluteUrl(pathOrUrl: string, siteUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return new URL(pathOrUrl, siteUrl).toString();
}

function upsertMeta(attribute: "name" | "property", key: string, content: string) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", href);
}

function clearManagedJsonLd() {
  const scripts = document.head.querySelectorAll(SEO_JSON_LD_SELECTOR);
  scripts.forEach((script) => script.remove());
}

function injectJsonLd(entries: JsonLdEntry[]) {
  entries.forEach((entry) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-managed", "true");
    script.text = JSON.stringify(entry);
    document.head.appendChild(script);
  });
}

export function SeoHead({
  title,
  description,
  canonicalPath = "/",
  robots = "index, follow",
  keywords,
  imagePath = DEFAULT_IMAGE_PATH,
  ogType = "website",
  jsonLd,
}: SeoHeadProps) {
  const siteUrl = import.meta.env.VITE_SITE_URL ?? DEFAULT_SITE_URL;
  const canonicalUrl = toAbsoluteUrl(canonicalPath, siteUrl);
  const imageUrl = toAbsoluteUrl(imagePath, siteUrl);
  const serializedJsonLd = JSON.stringify(jsonLd ?? null);

  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    if (keywords?.length) {
      upsertMeta("name", "keywords", keywords.join(", "));
    }
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:site_name", "CodeStream");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);
    upsertCanonical(canonicalUrl);

    clearManagedJsonLd();
    if (serializedJsonLd !== "null") {
      const parsedJsonLd = JSON.parse(serializedJsonLd) as JsonLdEntry | JsonLdEntry[];
      const entries = Array.isArray(parsedJsonLd) ? parsedJsonLd : [parsedJsonLd];
      injectJsonLd(entries);
    }
  }, [canonicalUrl, description, imageUrl, keywords, ogType, robots, serializedJsonLd, title]);

  return null;
}
