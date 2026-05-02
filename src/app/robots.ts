import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/terms", "/contact"],
        disallow: [
          "/dashboard",
          "/admin",
          "/profile",
          "/memory-sent",
          "/memory-received",
          "/guardian",
          "/onboarding",
          "/complete-profile",
          "/pending-verification",
          "/milestone",
          "/upgrade",
          "/api/",
        ],
      },
    ],
    sitemap: "https://timebridge.sg/sitemap.xml",
  };
}
