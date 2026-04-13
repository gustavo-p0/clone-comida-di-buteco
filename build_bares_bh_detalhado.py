#!/usr/bin/env python3
"""Scrape detalhes (Playwright), faz merge com output/bares_bh.json e grava CSV/JSON."""
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import scrape_bh_json  # noqa: F401 — força PLAYWRIGHT_BROWSERS_PATH antes do scrape
from scrape_bh_json import scrape_all

ROOT = Path(__file__).resolve().parent
ORIG = ROOT / "output" / "bares_bh.json"
OUT_JSON = ROOT / "output" / "bares_bh_detalhado.json"
OUT_CSV = ROOT / "output" / "bares_bh_detalhado.csv"

QUOTE_MAP = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201a": "'",
    "\u201b": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u00ab": '"',
    "\u00bb": '"',
}


def normalize_nome_key(s: str) -> str:
    if not s:
        return ""
    t = unicodedata.normalize("NFKC", s).strip()
    for a, b in QUOTE_MAP.items():
        t = t.replace(a, b)
    t = re.sub(r"\s+", " ", t)
    return t.casefold()


def normalize_nome_display(s: str) -> str:
    if not s:
        return ""
    t = unicodedata.normalize("NFKC", s).strip()
    for a, b in QUOTE_MAP.items():
        t = t.replace(a, b)
    return re.sub(r"\s+", " ", t)


def norm_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def digits_only(s: str) -> str:
    return re.sub(r"\D+", "", s or "")


def main():
    with open(ORIG, encoding="utf-8") as f:
        original = json.load(f)

    scraped = scrape_all()

    by_key: dict[str, list] = defaultdict(list)
    for row in scraped:
        by_key[normalize_nome_key(row.get("nome") or "")].append(row)

    final = []
    for orig in original:
        key = normalize_nome_key(orig.get("nome") or "")
        rows = by_key.get(key, [])
        detail = rows[0] if rows else None

        nome = normalize_nome_display(
            (detail.get("nome") if detail else None) or orig.get("nome") or ""
        )
        endereco_det = norm_spaces((detail.get("endereco") if detail else "") or "")
        endereco = endereco_det if endereco_det else norm_spaces(orig.get("endereco") or "")

        cidade = norm_spaces((detail.get("cidade") if detail else "") or "Belo Horizonte")
        estado = norm_spaces((detail.get("estado") if detail else "") or "MG")
        imagem_url = norm_spaces((detail.get("imagem_url") if detail else "") or "")
        fonte_url = orig.get("fonte_url") or ""
        detalhe_url = norm_spaces((detail.get("detalhe_url") if detail else "") or "")
        petisco = norm_spaces((detail.get("petisco_descricao") if detail else "") or "")
        telefone = digits_only((detail.get("telefone") if detail else "") or "")
        horario = norm_spaces((detail.get("horario") if detail else "") or "")
        maps_url = norm_spaces((detail.get("maps_url") if detail else "") or "")

        final.append(
            {
                "nome": nome,
                "endereco": endereco,
                "cidade": cidade,
                "estado": estado,
                "imagem_url": imagem_url,
                "fonte_url": fonte_url,
                "detalhe_url": detalhe_url,
                "petisco_descricao": petisco,
                "telefone": telefone,
                "horario": horario,
                "maps_url": maps_url,
            }
        )

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    fields = [
        "nome",
        "endereco",
        "cidade",
        "estado",
        "imagem_url",
        "fonte_url",
        "detalhe_url",
        "petisco_descricao",
        "telefone",
        "horario",
        "maps_url",
    ]
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(final)

    n = len(final)
    c_det = sum(1 for r in final if r["detalhe_url"])
    c_tel = sum(1 for r in final if r["telefone"])
    c_hor = sum(1 for r in final if r["horario"])
    c_img = sum(1 for r in final if r["imagem_url"])
    print(n)
    print(c_det)
    print(c_tel)
    print(c_hor)
    print(c_img)
    print(str(OUT_JSON))
    print(str(OUT_CSV))


if __name__ == "__main__":
    main()
