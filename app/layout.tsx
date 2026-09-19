import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "India MDM jobs radar", description: "A weekly signal of specialist MDM, PIM and data-governance roles in India." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
