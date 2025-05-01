import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
    title: "舞萌猜猜呗之潘一把",
    description: "舞萌猜猜呗之潘一把 Created with v0",
    generator: "YukiNeko with v0.dev",
    icons: {
        icon: "/favicon.svg",
        apple: "/favicon.svg",
    },
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return <ClientLayout>
        {children}
        <Analytics />
    </ClientLayout>
}
