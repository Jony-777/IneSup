import { NextResponse } from "next/server";
import { z } from "zod";
import { isIneApiConfigured, searchIneSection } from "@/lib/ine-api-server";

export const dynamic = "force-dynamic";

const querySchema = z.union([
  z.object({ query: z.string().trim().min(1).max(120), lat: z.undefined(), lng: z.undefined() }),
  z.object({ query: z.undefined(), lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }),
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    query: url.searchParams.get("q") || undefined,
    lat: url.searchParams.get("lat") || undefined,
    lng: url.searchParams.get("lng") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Indica una sección, municipio, colonia, CP o ubicación válida." }, { status: 400 });

  try {
    const result = await searchIneSection(parsed.data);
    if (!result.section && !result.matches.length) return NextResponse.json({ error: "No encontramos esa comunidad.", source: result.source }, { status: 404 });
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("No se pudo consultar la API del INE", error);
    return NextResponse.json(
      { error: "La fuente del INE no está disponible en este momento.", configured: isIneApiConfigured() },
      { status: 502 },
    );
  }
}

