import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import ClientLayout from "./ClientLayout"

export const metadata: Metadata = {
    title: "舞萌猜歌之潘一把",
    description: "舞萌猜歌之潘一把 Created with v0",
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
    return <ClientLayout>{children}</ClientLayout>
}
