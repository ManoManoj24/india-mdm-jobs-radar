import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://india-mdm-jobs-radar.vercel.app"),
  title: "India MDM jobs radar",
  description: "A high-signal weekly radar for specialist MDM, PIM, data governance and data quality roles in India.",
  openGraph:{title:"India MDM jobs radar",description:"Specialist roles. Direct employer links. Checked weekly.",url:"/",siteName:"India MDM jobs radar",type:"website",images:[{url:"/og.svg",width:1200,height:630,alt:"India MDM jobs radar"}]},
  twitter:{card:"summary_large_image",title:"India MDM jobs radar",description:"Specialist roles. Direct employer links. Checked weekly.",images:["/og.svg"]}
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
