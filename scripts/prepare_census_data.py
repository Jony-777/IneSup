"""Normaliza un CSV censal al contrato consumido por IneSup.

Uso:
  python scripts/prepare_census_data.py datos_crudos.csv data_secciones.json

El CSV debe incluir las columnas indicadas en REQUIRED_COLUMNS. El script no
inventa valores: rechaza filas incompletas o porcentajes fuera de 0..100.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


REQUIRED_COLUMNS = {
    "seccion", "cp", "colonia", "ciudad", "participacion",
    "promedio_municipal", "grupo_lider", "participacion_lider",
    "participacion_joven", "jovenes_para_top", "ranking_meta", "lat", "lng",
}


def normalize(source: Path) -> list[dict]:
    frame = pd.read_csv(source, dtype={"seccion": "string", "cp": "string"})
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Faltan columnas obligatorias: {', '.join(sorted(missing))}")

    frame = frame[list(REQUIRED_COLUMNS)].dropna()
    for column in ("participacion", "promedio_municipal", "participacion_lider", "participacion_joven"):
        frame[column] = pd.to_numeric(frame[column], errors="raise")
        if not frame[column].between(0, 100).all():
            raise ValueError(f"{column} contiene porcentajes fuera del rango 0..100")

    output = []
    for row in frame.to_dict(orient="records"):
        output.append({
            "seccion": str(row["seccion"]).strip(), "cp": str(row["cp"]).strip().zfill(5),
            "colonia": str(row["colonia"]).strip(), "ciudad": str(row["ciudad"]).strip(),
            "participacion": float(row["participacion"]), "promedioMunicipal": float(row["promedio_municipal"]),
            "grupoLider": str(row["grupo_lider"]).strip(), "participacionLider": float(row["participacion_lider"]),
            "participacionJoven": float(row["participacion_joven"]), "jovenesParaTop": int(row["jovenes_para_top"]),
            "rankingMeta": int(row["ranking_meta"]), "lat": float(row["lat"]), "lng": float(row["lng"]),
        })
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    records = normalize(args.source)
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(records)} secciones escritas en {args.destination}")


if __name__ == "__main__":
    main()
