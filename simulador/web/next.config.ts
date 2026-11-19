import type { NextConfig } from "next";

// El navegador solo habla con Next.js; Next.js reenvía /api/* a la API de TabPFN (FastAPI, puerto 8014).
const API = process.env.SIMULADOR_API ?? "http://127.0.0.1:8014";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Si la GPU está ocupada, TabPFN puede tardar más de los 30 s que espera el proxy por defecto.
  experimental: { proxyTimeout: Number(process.env.SIMULADOR_PROXY_TIMEOUT ?? 60_000) },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
