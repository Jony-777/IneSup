"""Aggregate the official INE CCPC 2024 CSV for one state into app-ready JSON.

Usage:
  python scripts/prepare_ine_ccpc_2024.py archive.zip output.json --state bc
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


AGE_BANDS = ((18, 29, "18 a 29 años"), (30, 49, "30 a 49 años"), (50, 64, "50 a 64 años"), (65, 200, "65 años o más"))
SEX_LABELS = {"0": "hombres", "1": "mujeres", "2": "personas no binarias"}


def ratio(votes: int, non_votes: int) -> float:
    denominator = votes + non_votes
    return round(votes * 100 / denominator, 1) if denominator else 0.0


def age_band(age: int) -> str:
    for minimum, maximum, label in AGE_BANDS:
        if minimum <= age <= maximum:
            return label
    return "edad no especificada"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--state", default="bc")
    args = parser.parse_args()

    suffix = f"conteoscensales2024_{args.state.lower()}.csv"
    sections: dict[tuple[str, str], dict] = {}
    municipalities: dict[str, dict[str, int]] = defaultdict(lambda: {"sv": 0, "nv": 0})

    with zipfile.ZipFile(args.archive) as archive:
        member = next((name for name in archive.namelist() if name.lower().endswith(suffix)), None)
        if not member:
            raise SystemExit(f"No se encontró {suffix} dentro del archivo.")
        with archive.open(member) as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
            for row in csv.DictReader(text):
                section_number = row["SECCION"].strip()
                municipality = row["MPIONOM"].strip()
                key = (municipality, section_number)
                item = sections.setdefault(key, {
                    "municipality": municipality,
                    "municipalityCode": row["MPIOCVE"].strip(),
                    "section": section_number,
                    "sectionType": row["TIPOSEC"].strip(),
                    "federalDistrict": row["DEF"].strip(),
                    "localDistrict": row["DEL"].strip(),
                    "sv": 0,
                    "nv": 0,
                    "ns": 0,
                    "youngSv": 0,
                    "youngNv": 0,
                    "groups": defaultdict(lambda: {"sv": 0, "nv": 0}),
                })
                sv, nv, ns = int(row["SV"]), int(row["NV"]), int(row["NS"])
                item["sv"] += sv
                item["nv"] += nv
                item["ns"] += ns
                municipalities[municipality]["sv"] += sv
                municipalities[municipality]["nv"] += nv

                age = int(row["EDAD"])
                sex = row["SEXO"].strip()
                if 18 <= age <= 24:
                    item["youngSv"] += sv
                    item["youngNv"] += nv
                group = f"{SEX_LABELS.get(sex, 'personas')} de {age_band(age)}"
                item["groups"][group]["sv"] += sv
                item["groups"][group]["nv"] += nv

    participation_by_municipality: dict[str, list[float]] = defaultdict(list)
    for item in sections.values():
        participation_by_municipality[item["municipality"]].append(ratio(item["sv"], item["nv"]))
    for values in participation_by_municipality.values():
        values.sort(reverse=True)

    output = []
    for item in sections.values():
        municipality = item["municipality"]
        participation = ratio(item["sv"], item["nv"])
        group_candidates = [
            pair for pair in item["groups"].items()
            if pair[1]["sv"] + pair[1]["nv"] >= 20
        ] or list(item["groups"].items())
        group_name, group_values = max(
            group_candidates,
            key=lambda pair: (ratio(pair[1]["sv"], pair[1]["nv"]), pair[1]["sv"] + pair[1]["nv"]),
        )
        eligible = item["sv"] + item["nv"]
        municipality_rates = participation_by_municipality[municipality]
        current_rank = municipality_rates.index(participation) + 1
        top_three_rate = municipality_rates[min(2, len(municipality_rates) - 1)]
        needed_for_top_three = max(0, math.ceil((top_three_rate + 0.01) * eligible / 100 - item["sv"]))
        available_young = item["youngNv"]

        if needed_for_top_three and needed_for_top_three <= available_young:
            young_goal = needed_for_top_three
            ranking_goal = min(3, len(municipality_rates))
        elif available_young:
            young_goal = available_young
            projected = ratio(item["sv"] + young_goal, max(0, item["nv"] - young_goal))
            ranking_goal = 1 + sum(1 for value in municipality_rates if value > projected)
        else:
            young_goal = 0
            ranking_goal = current_rank

        municipal = municipalities[municipality]
        output.append({
            "seccion": item["section"],
            "cp": None,
            "colonia": None,
            "ciudad": municipality,
            "participacion": participation,
            "promedioMunicipal": ratio(municipal["sv"], municipal["nv"]),
            "grupoLider": group_name,
            "participacionLider": ratio(group_values["sv"], group_values["nv"]),
            "participacionJoven": ratio(item["youngSv"], item["youngNv"]),
            "jovenesParaTop": young_goal,
            "rankingMeta": ranking_goal,
            "lat": None,
            "lng": None,
            "tipoSeccion": item["sectionType"],
            "distritoFederal": item["federalDistrict"],
            "distritoLocal": item["localDistrict"],
        })

    output.sort(key=lambda record: (record["ciudad"], int(record["seccion"])))
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text(json.dumps({
        "metadata": {
            "source": "Instituto Nacional Electoral — Conteos Censales de Participación Ciudadana 2024",
            "sourceUrl": "https://ine.mx/wp-content/uploads/2025/08/DatosAbiertos_DECEyEC_ConteosCensales2024.zip",
            "state": args.state.upper(),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "records": len(output),
        },
        "sections": output,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(output)} secciones oficiales escritas en {args.destination}")


if __name__ == "__main__":
    main()
