import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { opiniones } from "@/db/schema";
import { insertSupabaseOpinion, isSupabaseConfigured } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const schema = z.object({
  propuesta: z.string().trim().min(10).max(800),
  categoria: z.enum(["Infraestructura", "Juventud", "Educación", "Participación Cívica"]),
  ciudad: z.string().trim().min(2).max(80), codigoPostal: z.string().regex(/^\d{5}$/),
  colonia: z.string().trim().min(2).max(100), seccion: z.string().trim().min(1).max(12),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos de tu propuesta." }, { status: 400 });
    if (isSupabaseConfigured()) await insertSupabaseOpinion(parsed.data);
    else await getDb().insert(opiniones).values({ ...parsed.data, createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("No se pudo guardar la propuesta", error);
    return NextResponse.json({ error: "No pudimos guardar tu propuesta. Intenta de nuevo." }, { status: 500 });
  }
}
