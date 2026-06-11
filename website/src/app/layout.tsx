import type { Metadata, Viewport } from "next";
import type { PropsWithChildren } from "react";
import { Providers } from "@/context";
import { LayoutSelector } from "@/components/LayoutSelector";
import { GetGuides } from "@/utils/guides";
import { RESOURCE_NAV_LINKS } from "@/utils/nav";
import { SITE_CONFIG } from "@/utils/config";
import "@/assets/globals.css";

export const metadata: Metadata = {
  applicationName: SITE_CONFIG.NAME,
  title: {
    default: `${SITE_CONFIG.NAME} | ${SITE_CONFIG.TAGLINE}`,
    template: `%s | ${SITE_CONFIG.NAME}`,
  },
  description: SITE_CONFIG.DESCRIPTION,
  metadataBase: new URL(SITE_CONFIG.URL),
  openGraph: {
    type: "website",
    title: `${SITE_CONFIG.NAME} | ${SITE_CONFIG.TAGLINE}`,
    siteName: SITE_CONFIG.NAME,
    description: SITE_CONFIG.DESCRIPTION,
    url: SITE_CONFIG.URL,
    images: `${SITE_CONFIG.URL}/og.png`,
  },
  twitter: {
    card: "summary_large_image",
    site: SITE_CONFIG.SOCIAL_TWITTER,
    title: `${SITE_CONFIG.NAME} | ${SITE_CONFIG.TAGLINE}`,
    description: SITE_CONFIG.DESCRIPTION,
    images: `${SITE_CONFIG.URL}/og.png`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1.0,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout(props: PropsWithChildren) {
  const guideNavLinks = GetGuides().map((guide) => ({
    href: `/guides/${guide.slug}`,
    label: guide.title,
  }));

  return (
    <html lang="en">
      <body>
        <Providers>
          <LayoutSelector
            guideNavLinks={guideNavLinks}
            resourceNavLinks={RESOURCE_NAV_LINKS}
          >
            {props.children}
          </LayoutSelector>
        </Providers>
      </body>
    </html>
  );
}
