import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Design system",
  description:
    "Living gallery of the LPS Athletic AOS design system — tokens, type, and UI kit.",
  robots: { index: false, follow: false },
};

export default function StyleGuideLayout({ children }: { children: ReactNode }) {
  return children;
}
