"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, FileSpreadsheet, Filter, Inbox, KeyRound, LogOut, MapPin, RefreshCw, Search, ShieldCheck, Vote } from "lucide-react";

type Opinion = {
  id: number; propuesta: string; categoria: string; ciudad: string; codigoPostal: string;
  colonia: string; seccion: string; createdAt: string;
};

const categoryColors: Record<string, string> = {
  Infraestructura: "#ff7a5c", Juventud: "#9fe870", Educación: "#7ca6ff", "Participación Cívica": "#f0c94d",
};

export function AdminPanel() {
  const [key, setKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [rows, setRows] = useState<Opinion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [filters, setFilters] = useState({ ciudad: "", cp: "", colonia: "", seccion: "", search: "" });

  useEffect(() => { const saved = sessionStorage.getItem("civic-admin-key"); if (saved) setKey(saved); }, []);
  useEffect(() => { if (key) loadOpinions(key); }, [key]);

  async function loadOpinions(adminKey = key) {
    setStatus("loading");
    const response = await fetch("/api/admin/opiniones", { headers: { "x-admin-key": adminKey }, cache: "no-store" }).catch(() => null);
    if (!response?.ok) { setStatus("error"); return; }
    const data = await response.json(); setRows(data.opiniones); setStatus("ready");
  }

  function login(event: FormEvent) {
    event.preventDefault(); sessionStorage.setItem("civic-admin-key", draftKey); setKey(draftKey);
  }

  function logout() { sessionStorage.removeItem("civic-admin-key"); setKey(""); setDraftKey(""); setRows([]); setStatus("idle"); }

  const options = useMemo(() => ({
    ciudades: [...new Set(rows.map((row) => row.ciudad))].sort(),
    cps: [...new Set(rows.filter((row) => !filters.ciudad || row.ciudad === filters.ciudad).map((row) => row.codigoPostal))].sort(),
    colonias: [...new Set(rows.filter((row) => (!filters.ciudad || row.ciudad === filters.ciudad) && (!filters.cp || row.codigoPostal === filters.cp)).map((row) => row.colonia))].sort(),
    secciones: [...new Set(rows.map((row) => row.seccion))].sort(),
  }), [rows, filters.ciudad, filters.cp]);

  const filtered = useMemo(() => rows.filter((row) =>
    (!filters.ciudad || row.ciudad === filters.ciudad) && (!filters.cp || row.codigoPostal === filters.cp) &&
    (!filters.colonia || row.colonia === filters.colonia) && (!filters.seccion || row.seccion === filters.seccion) &&
    (!filters.search || `${row.propuesta} ${row.categoria}`.toLowerCase().includes(filters.search.toLowerCase()))
  ), [rows, filters]);

  const stats = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(categoryColors).map((category) => [category, filtered.filter((row) => row.categoria === category).length]));
    const max = Math.max(1, ...Object.values(counts));
    return { counts, max, locations: new Set(filtered.map((row) => row.colonia)).size };
  }, [filtered]);

  function exportFile(kind: "csv" | "xls") {
    const headers = ["Fecha", "Ciudad", "Código Postal", "Colonia", "Sección", "Categoría", "Propuesta"];
    const values = filtered.map((row) => [new Date(row.createdAt).toLocaleString("es-MX"), row.ciudad, row.codigoPostal, row.colonia, row.seccion, row.categoria, row.propuesta]);
    let content: string; let type: string; let extension: string;
    if (kind === "csv") {
      content = "\uFEFF" + [headers, ...values].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
      type = "text/csv;charset=utf-8"; extension = "csv";
    } else {
      const escape = (value: unknown) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      content = `<html><meta charset="utf-8"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${values.map((line) => `<tr>${line.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`;
      type = "application/vnd.ms-excel"; extension = "xls";
    }
    const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `propuestas-civicas-${new Date().toISOString().slice(0, 10)}.${extension}`; anchor.click(); URL.revokeObjectURL(url);
  }

  if (!key || status === "error") return (
    <main className="admin-login">
      <div className="admin-login-brand"><span className="brand-mark"><Vote size={20} /></span><span>IneSup</span></div>
      <form onSubmit={login} className="login-card">
        <span className="login-icon"><ShieldCheck /></span><p className="section-kicker">ACCESO PROTEGIDO</p><h1>Panel cívico</h1>
        <p>Consulta, filtra y exporta las propuestas ciudadanas.</p>
        <label htmlFor="admin-key">Clave de administración</label>
        <div className="key-field"><KeyRound size={18} /><input id="admin-key" type="password" value={draftKey} onChange={(e) => setDraftKey(e.target.value)} required autoFocus placeholder="Ingresa la clave" /></div>
        {status === "error" && <p className="form-error" role="alert">La clave no es válida o no se pudo conectar.</p>}
        <button className="submit-button">Entrar al panel</button>
        <Link href="/"><ArrowLeft size={15} /> Volver a la experiencia ciudadana</Link>
      </form>
    </main>
  );

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="brand"><span className="brand-mark"><Vote size={20} /></span><span>IneSup</span></Link>
        <nav><a className="active"><BarChart3 /> Resumen</a></nav>
        <button onClick={logout}><LogOut /> Cerrar sesión</button>
      </aside>
      <section className="admin-main">
        <header className="admin-header"><div><p className="section-kicker">PANEL DE CONTROL</p><h1>La voz de la comunidad</h1><p>Convierte propuestas ciudadanas en decisiones informadas.</p></div><button onClick={() => loadOpinions()} disabled={status === "loading"}><RefreshCw className={status === "loading" ? "spin" : ""} /> Actualizar</button></header>

        <div className="admin-stats">
          <article><span><Inbox /></span><div><small>Propuestas visibles</small><strong>{filtered.length}</strong></div></article>
          <article><span><MapPin /></span><div><small>Colonias activas</small><strong>{stats.locations}</strong></div></article>
          <article className="wide"><div className="stat-title"><small>Distribución por tema</small><strong>{filtered.length ? "Voz diversa" : "Sin datos"}</strong></div><div className="mini-bars">{Object.entries(stats.counts).map(([category, count]) => <div key={category} title={`${category}: ${count}`}><span style={{ height: `${Math.max(8, (count / stats.max) * 52)}px`, background: categoryColors[category] }} /><small>{count}</small></div>)}</div></article>
        </div>

        <section className="filter-panel">
          <div className="filter-heading"><span><Filter /></span><div><h2>Filtrar territorio</h2><p>Ciudad → código postal → colonia / sección</p></div><button onClick={() => setFilters({ ciudad: "", cp: "", colonia: "", seccion: "", search: "" })}>Limpiar filtros</button></div>
          <div className="filter-grid">
            <label>Ciudad<select value={filters.ciudad} onChange={(e) => setFilters({ ...filters, ciudad: e.target.value, cp: "", colonia: "" })}><option value="">Todas</option>{options.ciudades.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Código postal<select value={filters.cp} onChange={(e) => setFilters({ ...filters, cp: e.target.value, colonia: "" })}><option value="">Todos</option>{options.cps.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Colonia<select value={filters.colonia} onChange={(e) => setFilters({ ...filters, colonia: e.target.value })}><option value="">Todas</option>{options.colonias.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Sección<select value={filters.seccion} onChange={(e) => setFilters({ ...filters, seccion: e.target.value })}><option value="">Todas</option>{options.secciones.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </section>

        <section id="propuestas" className="proposals-panel">
          <div className="proposals-toolbar"><div><h2>Propuestas ciudadanas</h2><span>{filtered.length} resultados</span></div><div className="table-actions"><label className="table-search"><Search /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Buscar propuesta…" /></label><button onClick={() => exportFile("csv")}><Download /> CSV</button><button onClick={() => exportFile("xls")}><FileSpreadsheet /> Excel</button></div></div>
          <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Ubicación</th><th>Categoría</th><th>Propuesta</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</td><td><strong>{row.colonia}</strong><small>{row.ciudad} · CP {row.codigoPostal} · Sec. {row.seccion}</small></td><td><span className="category-chip" style={{ background: `${categoryColors[row.categoria]}26`, color: categoryColors[row.categoria] }}>{row.categoria}</span></td><td>{row.propuesta}</td></tr>)}</tbody></table>{status === "loading" && <div className="table-empty">Cargando propuestas…</div>}{status === "ready" && !filtered.length && <div className="table-empty"><Inbox /><strong>Aún no hay propuestas con estos filtros</strong><p>Las nuevas voces aparecerán aquí en tiempo real al actualizar.</p></div>}</div>
        </section>
      </section>
    </main>
  );
}
