import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Screenshot Editor",
    template: "%s · Screenshot Editor",
  },
  description:
    "Make screenshots look good: add a gradient background, padding, rounded corners and a shadow, then export a PNG. Runs in your browser.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the mobile tab bar pad itself clear of the iPhone home indicator.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script changes <html>'s class and style before React hydrates.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Inline and blocking on purpose: it sets the saved theme before the
            first paint, so a dark page never flashes light. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
