import { env } from "cloudflare:workers";
import { z } from "zod";
import { findSection, nearestSection, type CensusSection } from "@/lib/census-data";
import officialCcpc2024 from "@/data/ine/ccpc-2024-bc.json";

const sectionSchema = z.object({
  seccion: z.coerce.string().min(1),
  cp: z.string().regex(/^\d{5}$/).nullable().optional().transform((value) => value ?? null),
  colonia: z.string().min(1).nullable().optional().transform((value) => value ?? null),
  ciudad: z.string().min(1),
  participacion: z.coerce.number().min(0).max(100),
  promedioMunicipal: z.coerce.number().min(0).max(100),
  grupoLider: z.string().min(1),
  participacionLider: z.coerce.number().min(0).max(100),
  participacionJoven: z.coerce.number().min(0).max(100),
  jovenesParaTop: z.coerce.number().int().nonnegative(),
  rankingMeta: z.coerce.number().int().positive(),
  lat: z.coerce.number().nullable().optional().transform((value) => value ?? null),
  lng: z.coerce.number().nullable().optional().transform((value) => value ?? null),
  tipoSeccion: z.string().optional(),
  distritoFederal: z.coerce.string().optional(),
  distritoLocal: z.coerce.string().optional(),
});

type SearchInput = { query?: string; lat?: number; lng?: number };
type SearchSource = "ine-api" | "ine-ccpc-2024" | "demo";
type SearchResult = { section: CensusSection | null; matches: CensusSection[]; source: SearchSource };

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");
}

function isNameSearch(value: string) {
  return /[a-záéíóúüñ]/i.test(value);
}

function readConfig() {
  const url = env.INE_API_SECTIONS_URL ?? process.env.INE_API_SECTIONS_URL;
  const key = env.INE_API_KEY ?? process.env.INE_API_KEY;
  return url ? { url, key } : null;
}

function extractRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["data", "results", "secciones"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
  }
  return [record];
}

function localSearch(input: SearchInput): SearchResult {
  if (input.query) {
    const normalized = input.query.trim();
    const official = officialCcpc2024.sections.find((item) => item.seccion === normalized);
    if (official) return { section: official as CensusSection, matches: [], source: "ine-ccpc-2024" };
    const demo = findSection(input.query) ?? null;
    if (!isNameSearch(normalized)) return { section: demo, matches: [], source: "demo" };

    const name = normalizeText(normalized);
    const officialMatches = officialCcpc2024.sections
      .filter((item) => normalizeText(item.ciudad).includes(name))
      .sort((a, b) => Number(a.seccion) - Number(b.seccion))
      .slice(0, 12) as CensusSection[];

    if (officialMatches.length) {
      return {
        section: officialMatches.length === 1 ? officialMatches[0] : null,
        matches: officialMatches.length === 1 ? [] : officialMatches,
        source: "ine-ccpc-2024",
      };
    }

    return { section: demo, matches: [], source: "demo" };
  }
  if (typeof input.lat === "number" && typeof input.lng === "number") {
    return { section: nearestSection(input.lat, input.lng), matches: [], source: "demo" };
  }
  return { section: null, matches: [], source: "demo" };
}

export async function searchIneSection(input: SearchInput): Promise<SearchResult> {
  const config = readConfig();
  if (!config) return localSearch(input);

  const endpoint = new URL(config.url);
  if (input.query) endpoint.searchParams.set("query", input.query);
  if (typeof input.lat === "number") endpoint.searchParams.set("latitude", String(input.lat));
  if (typeof input.lng === "number") endpoint.searchParams.set("longitude", String(input.lng));

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`La API del INE respondió ${response.status}.`);

  const records = extractRecords(await response.json());
  const matches: CensusSection[] = [];
  for (const record of records) {
    const parsed = sectionSchema.safeParse(record);
    if (parsed.success) matches.push(parsed.data);
  }

  if (matches.length === 1) return { section: matches[0], matches: [], source: "ine-api" };
  if (matches.length > 1) return { section: null, matches: matches.slice(0, 12), source: "ine-api" };

  if (!records.length) return { section: null, matches: [], source: "ine-api" };
  throw new Error("La respuesta de la API del INE no coincide con el contrato esperado.");
}

export function isIneApiConfigured() {
  return Boolean(readConfig());
}

