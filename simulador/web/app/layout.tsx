import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const titulo = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--fuente-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fuente-texto", display: "swap" });

export const metadata: Metadata = {
  title: "Simulador de retrasos",
  description: "Simulador what-if del nivel de retraso de pedidos de última milla con TabPFN. Grupo 14, Machine Learning Supervisado, UDD.",
};

export const viewport: Viewport = { themeColor: "#0B1622", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
