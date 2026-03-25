import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/library/", "/billing/", "/login/"],
      },
    ],
    sitemap: "https://quicky.now/sitemap.xml",
  };
}
