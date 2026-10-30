export type CensusSection = {
  seccion: string; cp: string | null; colonia: string | null; ciudad: string;
  participacion: number; promedioMunicipal: number; grupoLider: string;
  participacionLider: number; participacionJoven: number; jovenesParaTop: number;
  rankingMeta: number; lat: number | null; lng: number | null;
  tipoSeccion?: string; distritoFederal?: string; distritoLocal?: string;
};

// Datos demostrativos. El pipeline oficial de Pandas debe producir este mismo contrato.
export const censusSections: CensusSection[] = [
  { seccion: "1234", cp: "22010", colonia: "Zona Río", ciudad: "Tijuana", participacion: 54, promedioMunicipal: 48, grupoLider: "mujeres de 30 a 49 años", participacionLider: 68, participacionJoven: 29, jovenesParaTop: 150, rankingMeta: 3, lat: 32.523, lng: -117.021 },
  { seccion: "1235", cp: "22044", colonia: "Cacho", ciudad: "Tijuana", participacion: 61, promedioMunicipal: 48, grupoLider: "mujeres de 40 a 59 años", participacionLider: 74, participacionJoven: 35, jovenesParaTop: 92, rankingMeta: 2, lat: 32.514, lng: -117.034 },
  { seccion: "2088", cp: "22106", colonia: "Otay Universidad", ciudad: "Tijuana", participacion: 46, promedioMunicipal: 48, grupoLider: "personas de 50 a 64 años", participacionLider: 63, participacionJoven: 25, jovenesParaTop: 178, rankingMeta: 5, lat: 32.528, lng: -116.951 },
  { seccion: "3310", cp: "21100", colonia: "Nueva", ciudad: "Mexicali", participacion: 57, promedioMunicipal: 51, grupoLider: "mujeres de 30 a 49 años", participacionLider: 70, participacionJoven: 32, jovenesParaTop: 120, rankingMeta: 3, lat: 32.663, lng: -115.467 },
  { seccion: "3311", cp: "21210", colonia: "Industrial", ciudad: "Mexicali", participacion: 49, promedioMunicipal: 51, grupoLider: "personas de 50 a 64 años", participacionLider: 65, participacionJoven: 27, jovenesParaTop: 164, rankingMeta: 5, lat: 32.649, lng: -115.453 },
  { seccion: "4512", cp: "22800", colonia: "Zona Centro", ciudad: "Ensenada", participacion: 59, promedioMunicipal: 52, grupoLider: "mujeres de 30 a 49 años", participacionLider: 71, participacionJoven: 34, jovenesParaTop: 88, rankingMeta: 3, lat: 31.866, lng: -116.596 },
];

export function findSection(query: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es-MX");
  const normalized = normalize(query);
  return censusSections.find((item) =>
    item.seccion === normalized ||
    item.cp === normalized ||
    (item.colonia ? normalize(item.colonia).includes(normalized) : false) ||
    normalize(item.ciudad).includes(normalized)
  );
}

export function nearestSection(lat: number, lng: number) {
  const located = censusSections.filter((item): item is CensusSection & { lat: number; lng: number } => typeof item.lat === "number" && typeof item.lng === "number");
  return located.length ? located.reduce((nearest, item) => Math.hypot(item.lat - lat, item.lng - lng) < Math.hypot(nearest.lat - lat, nearest.lng - lng) ? item : nearest) : null;
}
