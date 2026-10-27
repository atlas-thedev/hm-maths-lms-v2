"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

/**
 * defaultMode / allowToggle come from the Developer panel → Theme.
 * When switching is turned off, everyone gets the default (or their device setting for "system").
 */
export function Providers({ children, nonce, defaultMode = "light", allowToggle = true }: {
  children: React.ReactNode; nonce?: string; defaultMode?: "light" | "dark" | "system"; allowToggle?: boolean;
}) {
  return (
    <ThemeProvider nonce={nonce} attribute="class" defaultTheme={defaultMode} enableSystem={defaultMode === "system"}
      forcedTheme={!allowToggle && defaultMode !== "system" ? defaultMode : undefined} disableTransitionOnChange>
      {children}
      <Toaster richColors position="top-center" closeButton />
    </ThemeProvider>
  );
}
