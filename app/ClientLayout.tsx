"use client";

import type React from "react";

import { initializeCache } from "@/lib/api";
import { useEffect } from "react";

// This is a client component that initializes the cache
function CacheInitializer() {
  // Use a React effect to initialize the cache on the client side
  useEffect(() => {
    initializeCache();
  }, []);

  return null;
}

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CacheInitializer />
        {children}
      </body>
    </html>
  );
}
