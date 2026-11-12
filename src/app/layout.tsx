import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MacrOrigen — Inteligencia nutricional colombiana",
  description: "Planes alimenticios personalizados con cálculo verificable y alimentos de referencia colombiana.",
};

export const viewport: Viewport = { themeColor: "#059669", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" suppressHydrationWarning><body>{children}</body></html>;
}
