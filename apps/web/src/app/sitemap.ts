import type { MetadataRoute } from "next";

/** Public, session-free routes only — everything under /w/ is per-guest. */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/demo`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/demo/asset-reliability`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/demo/process-exceptions`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/demo/document-assurance`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/adapt`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
