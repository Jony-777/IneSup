import { env } from "cloudflare:workers";

export type SupabaseOpinionRow = {
  id: number;
  propuesta: string;
  categoria: string;
  ciudad: string;
  codigo_postal: string;
  colonia: string;
  seccion: string;
  created_at: string;
};

function readConfig() {
  const url = env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const secretKey = env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || (!secretKey && !publishableKey)) return null;
  return { url: url.replace(/\/$/, ""), secretKey, publishableKey };
}

export function isSupabaseConfigured() {
  return Boolean(readConfig());
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const config = readConfig();
  if (!config?.secretKey) throw new Error("La clave secreta de Supabase no está configurada en el servidor.");

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.secretKey,
      Authorization: `Bearer ${config.secretKey}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase respondió ${response.status}: ${detail.slice(0, 500)}`);
  }

  return response;
}

async function callOpinionsFunction(
  action: "insert" | "list",
  payload: Record<string, unknown>,
  adminKey?: string,
) {
  const config = readConfig();
  const apiKey = config?.publishableKey ?? config?.secretKey;
  if (!config || !apiKey) throw new Error("Supabase no está configurado en el servidor.");

  const response = await fetch(`${config.url}/functions/v1/opiniones-api`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(adminKey ? { "x-admin-key": adminKey } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`La función de Supabase respondió ${response.status}: ${detail.slice(0, 500)}`);
  }

  return response;
}

export async function insertSupabaseOpinion(input: {
  propuesta: string;
  categoria: string;
  ciudad: string;
  codigoPostal: string;
  colonia: string;
  seccion: string;
}) {
  const config = readConfig();
  if (config?.publishableKey && !config.secretKey) {
    await callOpinionsFunction("insert", { opinion: input });
    return;
  }

  await supabaseRequest("opiniones", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      propuesta: input.propuesta,
      categoria: input.categoria,
      ciudad: input.ciudad,
      codigo_postal: input.codigoPostal,
      colonia: input.colonia,
      seccion: input.seccion,
    }),
  });
}

export async function listSupabaseOpinions(filters: Record<string, string>, adminKey?: string) {
  const config = readConfig();
  let rows: SupabaseOpinionRow[];

  if (config?.publishableKey && !config.secretKey) {
    const response = await callOpinionsFunction("list", { filters }, adminKey);
    const data = await response.json() as { opiniones: SupabaseOpinionRow[] };
    rows = data.opiniones;
  } else {
    const params = new URLSearchParams({ select: "*", order: "created_at.desc" });
    const columns: Record<string, string> = {
      ciudad: "ciudad",
      cp: "codigo_postal",
      colonia: "colonia",
      seccion: "seccion",
    };

    for (const [name, column] of Object.entries(columns)) {
      const value = filters[name];
      if (value) params.set(column, `eq.${value}`);
    }

    const response = await supabaseRequest(`opiniones?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    rows = await response.json() as SupabaseOpinionRow[];
  }

  return rows.map((row) => ({
    id: row.id,
    propuesta: row.propuesta,
    categoria: row.categoria,
    ciudad: row.ciudad,
    codigoPostal: row.codigo_postal,
    colonia: row.colonia,
    seccion: row.seccion,
    createdAt: row.created_at,
  }));
}
