"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Download,
  LocateFixed, LockKeyhole, MapPin, MessageSquareText, Search, Send,
  Menu, Vote, X,
} from "lucide-react";
import type { CensusSection } from "@/lib/census-data";

const categories = ["Infraestructura", "Juventud", "Educación", "Participación Cívica"] as const;

const fallbackHeroCards = [
  { label: "VISTA PREVIA", metric: "—", detail: "participación", copy: "Busca tu sección para conocer sus datos.", theme: "hero-card-green" },
  { label: "VISTA PREVIA", metric: "—", detail: "grupo con mayor participación", copy: "Descubre quiénes participan más en tu zona.", theme: "hero-card-coral" },
  { label: "VISTA PREVIA", metric: "—", detail: "participación joven", copy: "Conoce el reto de participación de las juventudes.", theme: "hero-card-blue" },
  { label: "VISTA PREVIA", metric: "—", detail: "posible impacto", copy: "Explora cómo más voces pueden cambiar la historia.", theme: "hero-card-yellow" },
] as const;

function buildHeroCards(section: CensusSection) {
  return [
    { label: `EJEMPLO REAL · SECCIÓN ${section.seccion}`, metric: `${section.participacion}%`, detail: "participó", copy: `El promedio de ${section.ciudad} fue ${section.promedioMunicipal}%.`, theme: "hero-card-green" },
    { label: "GRUPO CON MAYOR PARTICIPACIÓN", metric: `${section.participacionLider}%`, detail: "participación", copy: `El grupo que más participó fue: ${section.grupoLider}.`, theme: "hero-card-coral" },
    { label: "PARTICIPACIÓN JOVEN", metric: `${section.participacionJoven}%`, detail: "jóvenes de 18 a 24", copy: "Aquí hay una oportunidad para sumar más voces jóvenes.", theme: "hero-card-blue" },
    { label: "POSIBLE IMPACTO", metric: `+${section.jovenesParaTop}`, detail: "jóvenes participando", copy: `La sección podría acercarse al puesto ${section.rankingMeta} de su municipio.`, theme: "hero-card-yellow" },
  ];
}

type Story = {
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  footer: string;
  theme: string;
};

function buildStories(section: CensusSection): Story[] {
  const above = section.participacion >= section.promedioMunicipal;
  const participationDifference = Number((section.participacion - section.promedioMunicipal).toFixed(1));
  const community = section.colonia ?? section.ciudad;
  return [
    {
      eyebrow: "01 · El diagnóstico",
      title: above ? "Tu comunidad ya está levantando la voz." : "Tu comunidad puede hacerse escuchar más.",
      body: `En la sección ${section.seccion}, la participación fue de ${section.participacion}%. El promedio de ${section.ciudad} es ${section.promedioMunicipal}%.`,
      metric: `${above ? "+" : ""}${participationDifference} pts`,
      footer: above ? "por encima del promedio municipal" : "frente al promedio municipal",
      theme: "story-green",
    },
    {
      eyebrow: "02 · El perfil líder",
      title: "Ellas y ellos están marcando el ritmo.",
      body: `El grupo con mayor participación en ${community} fue el de ${section.grupoLider}.`,
      metric: `${section.participacionLider}%`,
      footer: "participación del grupo líder",
      theme: "story-coral",
    },
    {
      eyebrow: "03 · El reto joven",
      title: "Aquí podemos cambiar la historia.",
      body: "Las decisiones de hoy duran años. La voz joven merece pesar desde ahora.",
      metric: `${section.participacionJoven}%`,
      footer: "participación entre jóvenes de 18 a 24",
      theme: "story-blue",
    },
    {
      eyebrow: "04 · El impacto",
      title: "Un pequeño impulso. Un cambio enorme.",
      body: section.jovenesParaTop > 0
        ? `Si ${section.jovenesParaTop} jóvenes más participan, la sección ${section.seccion} podría escalar posiciones en todo el municipio.`
        : `La sección ${section.seccion} ya se encuentra entre las zonas con mayor participación de su municipio.`,
      metric: `Top ${section.rankingMeta}`,
      footer: "meta de participación municipal",
      theme: "story-yellow",
    },
  ];
}

type CitizenPage = "home" | "how" | "mailbox" | "stories";
type DataSource = "ine-api" | "ine-ccpc-2024" | "demo";
type SectionLookup = { section: CensusSection | null; matches: CensusSection[]; source: DataSource };

function communityName(section: CensusSection) {
  return section.colonia ?? section.ciudad;
}

function communityAndCity(section: CensusSection) {
  return section.colonia ? `${section.colonia} · ${section.ciudad}` : section.ciudad;
}

function sectionLocation(section: CensusSection) {
  return `Sección ${section.seccion}${section.cp ? ` · CP ${section.cp}` : ` · ${section.ciudad}`}`;
}

function metricSizeClass(metric: string) {
  if (metric.length >= 10) return "metric-long";
  if (metric.length >= 7) return "metric-medium";
  return "metric-short";
}

export function CitizenExperience({ page = "home" }: { page?: CitizenPage }) {
  const [query, setQuery] = useState("");
  const [heroCard, setHeroCard] = useState(0);
  const [previewSection, setPreviewSection] = useState<CensusSection | null>(null);
  const [section, setSection] = useState<CensusSection | null>(null);
  const [activeStory, setActiveStory] = useState(0);
  const [searchError, setSearchError] = useState("");
  const [searchMatches, setSearchMatches] = useState<CensusSection[]>([]);
  const [searching, setSearching] = useState(false);
  const [dataSource, setDataSource] = useState<DataSource>("demo");
  const [locating, setLocating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const storiesRef = useRef<HTMLElement>(null);
  const stories = useMemo(() => section ? buildStories(section) : [], [section]);
  const heroCards = useMemo(() => previewSection ? buildHeroCards(previewSection) : fallbackHeroCards, [previewSection]);

  useEffect(() => {
    if (page !== "home") return;
    void loadSection(new URLSearchParams({ q: "1234" }), false).then((found) => {
      if (found) setPreviewSection(found);
    });
  }, [page]);

  useEffect(() => {
    if (page !== "stories") return;
    const requested = new URLSearchParams(window.location.search).get("seccion");
    if (!requested) return;
    void loadSection(new URLSearchParams({ q: requested }), true).then((found) => {
      if (!found) return;
      setSection(found);
      setQuery(found.seccion);
    });
  }, [page]);

  async function requestSections(params: URLSearchParams, reportError = true): Promise<SectionLookup | null> {
    const response = await fetch(`/api/ine/secciones?${params.toString()}`, { cache: "no-store" }).catch(() => null);
    if (!response) {
      if (reportError) setSearchError("No pudimos conectarnos. Revisa tu conexión e intenta nuevamente.");
      return null;
    }
    if (response.status === 404) {
      if (reportError) setSearchError("No encontramos esa comunidad en Baja California. Prueba con el municipio, la colonia, el código postal o la sección.");
      return null;
    }
    if (!response.ok) {
      if (reportError) setSearchError("Los datos del INE no están disponibles en este momento. Intenta nuevamente en unos minutos.");
      return null;
    }
    const result = await response.json() as SectionLookup;
    setDataSource(result.source);
    if (reportError) setSearchError("");
    return result;
  }

  async function loadSection(params: URLSearchParams, reportError = true) {
    return (await requestSections(params, reportError))?.section ?? null;
  }

  function showSection(found: CensusSection) {
    if (page === "home") {
      window.location.assign(`/datos?seccion=${encodeURIComponent(found.seccion)}`);
      return;
    }
    setSection(found);
    setQuery(found.seccion);
    setSearchMatches([]);
    setActiveStory(0);
    setSearchError("");
    window.setTimeout(() => {
      const target = page === "mailbox" ? document.getElementById("buzon") : storiesRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    if (!query.trim()) {
      setSearching(false);
      setSearchError("Escribe una sección, municipio, colonia o código postal.");
      return;
    }
    const result = await requestSections(new URLSearchParams({ q: query }), true);
    setSearching(false);
    if (!result) {
      setSearchMatches([]);
      return;
    }
    if (result.matches.length) {
      setSearchMatches(result.matches);
      window.setTimeout(() => {
        document.querySelector(".search-results")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      return;
    }
    if (result.section) showSection(result.section);
  }

  function searchResults() {
    if (!searchMatches.length) return null;
    return (
      <div className="search-results" role="region" aria-live="polite" aria-label="Secciones encontradas">
        <p>Encontramos varias secciones. Elige la tuya:</p>
        <div>
          {searchMatches.map((match) => (
            <button key={match.seccion} type="button" onClick={() => showSection(match)}>
              <span>Sección {match.seccion}</span>
              <small>{match.ciudad}{match.colonia ? ` · ${match.colonia}` : ""}</small>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
        <small>Mostramos las primeras opciones. Si conoces tu sección, escríbela para ir directamente.</small>
      </div>
    );
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setSearchError("Tu navegador no permite usar la ubicación.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const found = await loadSection(new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude) }), false);
        if (found) showSection(found);
        else setSearchError("No pudimos identificar tu sección con esa ubicación. Escribe el número que aparece en tu credencial para votar.");
        setLocating(false);
      },
      () => { setSearchError("No pudimos usar tu ubicación. Escribe el número de sección que aparece en tu credencial para votar."); setLocating(false); },
      { timeout: 8000, enableHighAccuracy: false },
    );
  }

  function changeStory(next: number) {
    setActiveStory(Math.max(0, Math.min(stories.length - 1, next)));
  }

  function changeHeroCard(direction: number) {
    setHeroCard((current) => (current + direction + heroCards.length) % heroCards.length);
  }

  function downloadStory() {
    if (!section || !stories[activeStory]) return;
    const story = stories[activeStory];
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const palettes = [["#0b3b32", "#c9ff62"], ["#ea5b46", "#ffe9d6"], ["#3157d8", "#d9e5ff"], ["#f1c83b", "#17150d"]];
    const [bg, fg] = palettes[activeStory];
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = activeStory === 3 ? "rgba(255,255,255,.38)" : "rgba(255,255,255,.09)";
    ctx.beginPath(); ctx.arc(900, 200, 350, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fg; ctx.font = "700 34px Arial"; ctx.fillText("INESUP", 90, 120);
    ctx.font = "600 31px Arial"; ctx.fillText(story.eyebrow.toUpperCase(), 90, 310);
    ctx.font = "900 190px Arial"; ctx.fillText(story.metric, 90, 650);
    wrapCanvasText(ctx, story.title, 90, 820, 900, 86, "800 72px Arial");
    wrapCanvasText(ctx, story.body, 90, 1190, 860, 58, "400 42px Arial");
    ctx.fillStyle = fg; ctx.fillRect(90, 1660, 900, 3);
    ctx.font = "700 30px Arial"; ctx.fillText(`SECCIÓN ${section.seccion} · ${section.ciudad.toUpperCase()}`, 90, 1720);
    ctx.font = "500 27px Arial"; ctx.fillText(section.cp ? `${communityAndCity(section)} · CP ${section.cp}` : communityAndCity(section), 90, 1770);
    ctx.font = "500 25px Arial"; ctx.fillText(dataSource === "demo" ? "Vista demostrativa" : "Fuente: INE · CCPC 2024", 90, 1830);
    ctx.font = "700 25px Arial"; ctx.fillText("INESUP · Tu voz también cuenta.", 90, 1875);
    const link = document.createElement("a");
    link.download = `inesup-ine-2024-seccion-${section.seccion}-historia-${activeStory + 1}.png`;
    link.href = canvas.toDataURL("image/png"); link.click();
  }

  async function submitOpinion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!section) return;
    const form = event.currentTarget;
    setFormState("sending");
    const data = new FormData(form);
    const response = await fetch("/api/opiniones", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propuesta: data.get("propuesta"), categoria: data.get("categoria"), ciudad: section.ciudad,
        codigoPostal: section.cp ?? data.get("codigoPostal"), colonia: section.colonia ?? data.get("colonia"), seccion: section.seccion,
      }),
    }).catch(() => null);
    if (response?.ok) { form.reset(); setFormState("success"); }
    else setFormState("error");
  }

  return (
    <main className={`site-shell page-${page} ${page !== "home" ? "inner-page" : ""}`}>
      <nav className="topbar" aria-label="Navegación principal">
        <Link href="/" className="brand"><span className="brand-mark"><Vote size={20} /></span><span>IneSup</span></Link>
        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={25} />}
        </button>
        <div id="main-menu" className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link href="/como-funciona" onClick={() => setMenuOpen(false)}>Cómo funciona</Link>
          <Link href="/buzon" onClick={() => setMenuOpen(false)}>Buzón cívico</Link>
          <Link href="/admin" onClick={() => setMenuOpen(false)}><LockKeyhole size={14} /> Panel</Link>
        </div>
      </nav>

      {page === "home" && <section id="inicio" className={`hero ${searchMatches.length ? "search-open" : ""}`}>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-copy">
          <p className="kicker"><span /> Datos que se entienden. Voces que cuentan.</p>
          <h1>Tu colonia<br />también tiene<br /><em>una historia.</em></h1>
          <p className="hero-lede">Descubre cómo participa tu comunidad y súmate a construir las decisiones del mañana.</p>
          <form className="search-card" onSubmit={handleSearch}>
            <label htmlFor="section-search">Busca tu comunidad</label>
            <div className="search-row">
              <div className="search-input"><Search size={19} /><input id="section-search" value={query} onChange={(e) => { setQuery(e.target.value); setSearchMatches([]); }} placeholder="Sección, municipio, colonia o CP" /></div>
              <button type="submit" className="primary-button" disabled={searching}>{searching ? "Consultando…" : <>Descubrir <ArrowRight size={18} /></>}</button>
            </div>
            <div className="search-foot"><button type="button" className="location-button" onClick={useLocation} disabled={locating}><LocateFixed size={16} /> {locating ? "Buscando…" : "Usar mi ubicación"}</button><span>Ejemplo: Tijuana o 1234</span></div>
            {searchError && <p className="form-error" role="alert">{searchError}</p>}
            {searchResults()}
          </form>
        </div>
        <div className="hero-visual" aria-label="Vista previa interactiva de las historias">
          <div className="hero-carousel">
            <button className="hero-carousel-arrow previous" type="button" onClick={() => changeHeroCard(-1)} aria-label="Tarjeta anterior"><ArrowLeft /></button>
            <button
              type="button"
              className={`preview-card preview-interactive ${heroCards[heroCard].theme}`}
              onClick={() => changeHeroCard(1)}
              aria-label={`${heroCards[heroCard].label}. Haz clic para ver la siguiente tarjeta`}
            >
              <span>{heroCards[heroCard].label}</span>
              <div className="preview-card-metric"><strong>{heroCards[heroCard].metric}</strong><small>{heroCards[heroCard].detail}</small></div>
              <p>{heroCards[heroCard].copy}</p>
              <em>Haz clic para continuar <ArrowRight size={15} /></em>
            </button>
            <button className="hero-carousel-arrow next" type="button" onClick={() => changeHeroCard(1)} aria-label="Siguiente tarjeta"><ArrowRight /></button>
            <div className="hero-carousel-dots" aria-label="Elegir tarjeta">
              {heroCards.map((card, index) => <button key={`${index}-${card.theme}`} type="button" className={index === heroCard ? "active" : ""} onClick={() => setHeroCard(index)} aria-label={`Ver tarjeta ${index + 1}: ${card.label}`} />)}
            </div>
          </div>
        </div>
        <Link className="scroll-cue" href="/como-funciona"><ArrowDown size={17} /> Descubre cómo funciona</Link>
      </section>}

      {page === "how" && <section id="como-funciona" className="how-modern">
        <div className="how-glow how-glow-one" /><div className="how-glow how-glow-two" />
        <header className="how-intro">
          <div>
            <p className="section-kicker">TU PARTICIPACIÓN, PASO A PASO</p>
            <h1>Entender.<br />Participar.<br /><em>Transformar.</em></h1>
          </div>
          <div className="how-intro-copy">
            <span className="how-count">03 pasos sencillos</span>
            <p>Tomamos información pública del INE y la convertimos en historias fáciles de entender sobre la participación en tu comunidad.</p>
            <div className="how-actions"><Link href="/" className="primary-button">Explorar mi comunidad <ArrowRight size={18} /></Link><Link href="/buzon" className="how-text-link">Ir al buzón cívico <ArrowRight size={16} /></Link></div>
          </div>
        </header>
        <div className="modern-steps">
          <article className="modern-step step-lime">
            <div className="step-top"><span>01</span><i><MapPin /></i></div>
            <div><small>BUSCA</small><h2>Encuentra<br />tu comunidad.</h2><p>Escribe tu municipio, colonia, código postal o el número de sección que aparece en tu credencial. Tenemos información de 2,104 secciones de Baja California.</p></div>
            <strong>Busca por nombre o sección <ArrowRight size={18} /></strong>
          </article>
          <article className="modern-step step-coral">
            <div className="step-top"><span>02</span><i><BarChart3 /></i></div>
            <div><small>DESCUBRE</small><h2>Conoce<br />tu historia.</h2><p>Te mostramos cuántas personas participaron, cómo se compara tu zona y qué grupos participan más.</p></div>
            <strong>Datos fáciles de entender <ArrowRight size={18} /></strong>
          </article>
          <article className="modern-step step-ink">
            <div className="step-top"><span>03</span><i><MessageSquareText /></i></div>
            <div><small>PARTICIPA</small><h2>Hazte<br />escuchar.</h2><p>Escribe qué necesita tu colonia. Te pediremos tu colonia y código postal para ubicar la propuesta, pero no tu nombre ni correo.</p></div>
            <strong>Tu voz cuenta <ArrowRight size={18} /></strong>
          </article>
        </div>
        <div className="how-closing"><span>Datos públicos del INE · 2024</span><i /><span>2,104 comunidades disponibles</span><i /><span>Sin nombre ni correo</span></div>
      </section>}

      {page === "stories" && section && (
        <section id="historias" ref={storiesRef} className="stories-section">
          <div className="stories-heading"><div><p className="section-kicker light">TU HISTORIA CÍVICA</p><h2>{communityName(section)},<br /><span>esto dicen tus datos.</span></h2></div><div className="location-pill"><MapPin size={17} /> {sectionLocation(section)}</div></div>
          <div className="story-stage">
            <div className="story-phone">
              <div className="story-progress">{stories.map((_, index) => <button key={index} aria-label={`Ir a historia ${index + 1}`} onClick={() => setActiveStory(index)} className={index <= activeStory ? "active" : ""}><span /></button>)}</div>
              <article
                className={`story-card ${stories[activeStory].theme}`}
                role="button"
                tabIndex={0}
                aria-label={`${stories[activeStory].eyebrow}. Toca para ver la siguiente historia`}
                onClick={() => changeStory((activeStory + 1) % stories.length)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") changeStory((activeStory + 1) % stories.length);
                }}
              >
                <div className="story-shape" />
                <div className="story-top"><span className="mini-brand">I<span>•</span></span><span>{stories[activeStory].eyebrow}</span></div>
                <div className="story-content"><p>{stories[activeStory].body}</p><strong className={metricSizeClass(stories[activeStory].metric)}>{stories[activeStory].metric}</strong><small>{stories[activeStory].footer}</small><h3>{stories[activeStory].title}</h3></div>
                <div className="story-place">{communityAndCity(section)}</div>
                <span className="story-tap-cue">Toca para continuar <ArrowRight size={15} /></span>
              </article>
              <div className="story-mobile-nav">
                <button type="button" onClick={() => changeStory(activeStory - 1)} disabled={activeStory === 0} aria-label="Historia anterior"><ArrowLeft /></button>
                <button type="button" onClick={() => changeStory(activeStory + 1)} disabled={activeStory === stories.length - 1} aria-label="Historia siguiente"><ArrowRight /></button>
              </div>
            </div>
            <div className="story-controls">
              <div><p><span>0{activeStory + 1}</span> / 04</p><h3>{stories[activeStory].eyebrow.split("· ")[1]}</h3></div>
              <div className="arrow-buttons">
                <button className="story-nav-button previous" onClick={() => changeStory(activeStory - 1)} disabled={activeStory === 0} aria-label="Historia anterior">
                  <span className="story-nav-icon"><ArrowLeft /></span>
                  <span><small>Anterior</small><strong>{activeStory > 0 ? stories[activeStory - 1].eyebrow.split("· ")[1] : "Primera historia"}</strong></span>
                </button>
                <button className="story-nav-button next" onClick={() => changeStory(activeStory + 1)} disabled={activeStory === stories.length - 1} aria-label="Historia siguiente">
                  <span><small>Siguiente</small><strong>{activeStory < stories.length - 1 ? stories[activeStory + 1].eyebrow.split("· ")[1] : "Historia final"}</strong></span>
                  <span className="story-nav-icon"><ArrowRight /></span>
                </button>
              </div>
              <button className="download-button" onClick={downloadStory}><Download size={18} /> Descargar para redes</button>
              <p className="data-note">{dataSource === "ine-api" ? "Fuente: API oficial del INE · CCPC 2009–2024." : dataSource === "ine-ccpc-2024" ? "Fuente: INE · Conteos Censales de Participación Ciudadana 2024." : "Datos demostrativos para funciones territoriales sin equivalencia en la base CCPC."}</p>
            </div>
          </div>
        </section>
      )}

      {page === "mailbox" && <>
      <section id="top" className="page-search-band">
        <div><p className="section-kicker light">ENCUENTRA TU ZONA</p><h1>Tu comunidad,<br /><em>tu propuesta.</em></h1><p>Busca por municipio, colonia, sección electoral o código postal para enviar una propuesta al buzón cívico.</p></div>
        <form className="search-card" onSubmit={handleSearch}>
          <label htmlFor="mailbox-search">Busca tu comunidad</label>
          <div className="search-row">
            <div className="search-input"><Search size={19} /><input id="mailbox-search" value={query} onChange={(e) => { setQuery(e.target.value); setSearchMatches([]); }} placeholder="Sección, municipio, colonia o CP" /></div>
            <button type="submit" className="primary-button" disabled={searching}>{searching ? "Consultando…" : <>Continuar <ArrowRight size={18} /></>}</button>
          </div>
          <div className="search-foot"><button type="button" className="location-button" onClick={useLocation} disabled={locating}><LocateFixed size={16} /> {locating ? "Buscando…" : "Usar mi ubicación"}</button><span>Ejemplo: Mexicali o 1234</span></div>
          {searchError && <p className="form-error" role="alert">{searchError}</p>}
          {searchResults()}
        </form>
      </section>
      <section id="buzon" className="mailbox-section">
        <div className="mailbox-copy"><p className="section-kicker">BUZÓN CÍVICO</p><h2>El dato abre<br />la conversación.<br /><em>Tu voz la mueve.</em></h2><p>Cuéntanos qué necesita tu colonia. Cada propuesta se organiza para convertir muchas voces en prioridades claras.</p><div className="privacy-note"><CheckCircle2 /><span><strong>Sin nombre ni correo.</strong><br />Tu propuesta se registra de forma anónima.</span></div></div>
        <div className="mailbox-form-wrap">
          {!section ? (
            <div className="empty-form"><MessageSquareText /><h3>Primero encuentra tu comunidad</h3><p>Usaremos la sección y el código postal que elijas para clasificar tu propuesta.</p><a href="#top" className="primary-button">Buscar mi zona <ArrowRight size={18} /></a></div>
          ) : formState === "success" ? (
            <div className="success-state"><span><CheckCircle2 /></span><h3>Tu voz ya cuenta.</h3><p>Recibimos tu propuesta para {communityName(section)}. Gracias por participar.</p><button onClick={() => setFormState("idle")}>Enviar otra propuesta</button></div>
          ) : (
            <form onSubmit={submitOpinion} className="opinion-form">
              <div className="form-location"><MapPin /><div><span>Tu comunidad</span><strong>{sectionLocation(section)}</strong></div><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Cambiar</button></div>
              {!section.colonia && <label>Colonia<input name="colonia" required minLength={2} maxLength={100} placeholder="Escribe tu colonia" /></label>}
              {!section.cp && <label>Código postal<input name="codigoPostal" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} placeholder="Ej. 22010" /></label>}
              <label>Tema de tu propuesta<select name="categoria" defaultValue="" required><option value="" disabled>Selecciona una categoría</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>¿Qué necesita tu comunidad?<textarea name="propuesta" required minLength={10} maxLength={800} placeholder="Describe tu propuesta u opinión de forma concreta…" /><small>Máximo 800 caracteres</small></label>
              {formState === "error" && <p className="form-error" role="alert">No pudimos enviarla. Revisa tu conexión e intenta de nuevo.</p>}
              <button type="submit" className="submit-button" disabled={formState === "sending"}>{formState === "sending" ? "Enviando…" : <>Enviar mi propuesta <Send size={18} /></>}</button>
            </form>
          )}
        </div>
      </section>
      </>}

      {page !== "home" && <footer><div className="brand"><span className="brand-mark"><Vote size={20} /></span><span>IneSup</span></div><p>Información que conecta. Participación que transforma.</p></footer>}
    </main>
  );
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string) {
  ctx.font = font;
  const words = text.split(" "); let line = ""; let currentY = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, currentY); line = `${word} `; currentY += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, x, currentY);
}
