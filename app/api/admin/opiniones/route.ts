import { NextResponse } from "next/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { opiniones } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured, listSupabaseOpinions } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(request.url);
  if (isSupabaseConfigured()) {
    const filters = Object.fromEntries(["ciudad", "cp", "colonia", "seccion"].map((name) => [name, url.searchParams.get(name) ?? ""]));
    return NextResponse.json({ opiniones: await listSupabaseOpinions(filters, request.headers.get("x-admin-key") ?? "") });
  }
  const filters: SQL[] = [];
  const map = [["ciudad", opiniones.ciudad], ["cp", opiniones.codigoPostal], ["colonia", opiniones.colonia], ["seccion", opiniones.seccion]] as const;
  for (const [param, column] of map) { const value = url.searchParams.get(param); if (value) filters.push(eq(column, value)); }
  const rows = await getDb().select().from(opiniones).where(filters.length ? and(...filters) : undefined).orderBy(desc(opiniones.createdAt));
  return NextResponse.json({ opiniones: rows });
}
