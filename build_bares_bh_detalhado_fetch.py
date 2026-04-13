#!/usr/bin/env python3
"""
Enriquece output/bares_bh.json com páginas /buteco/ (listagem + detalhe).
Usa curl_cffi (impersonate Chrome) — sem Playwright. Cloudflare bloqueia requests puro.
"""
from __future__ import annotations

import csv
import html as html_module
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent
ORIG = ROOT / "output" / "bares_bh.json"
OUT_JSON = ROOT / "output" / "bares_bh_detalhado.json"
OUT_CSV = ROOT / "output" / "bares_bh_detalhado.csv"

BASE = "https://comidadibuteco.com.br"
LISTING = f"{BASE}/butecos/belo-horizonte/"

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

# Não incluir "Praça" aqui — conflita com nomes tipo "Bar da Praça".
ADDR_MAIN = re.compile(
    r"\s+(R\.|Rua|Avenida|Av\.|Av |Praia|Estrada|Alameda|Rod\.|Trav\.|Largo|Via |Est\.)\s",
    re.I,
)
ADDR_PRAÇA = re.compile(r"\s+Praça\s+", re.I)


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


def fetch_html(url: str, sess: requests.Session) -> str:
    r = sess.get(url, impersonate="chrome", timeout=90)
    r.raise_for_status()
    return r.text


def parse_listing_item(it: BeautifulSoup) -> tuple[str, str, str] | None:
    t = it.get_text(" ", strip=True)
    if "Detalhes" not in t:
        return None
    left = t.split("Detalhes")[0].strip()
    m = ADDR_MAIN.search(" " + left)
    if not m:
        m = ADDR_PRAÇA.search(" " + left)
    if not m:
        return None
    nome = left[: m.start()].strip()
    href = ""
    for a in it.find_all("a", href=True):
        if (
            a.get_text(strip=True).lower() == "detalhes"
            and "/buteco/" in a["href"]
            and "/butecos/" not in a["href"]
        ):
            href = a["href"].split("#")[0]
            if not href.endswith("/"):
                href += "/"
            break
    if not href:
        return None
    maps = ""
    for a in it.find_all("a", href=True):
        if "como chegar" in (a.get_text() or "").lower():
            maps = (a.get("href") or "").replace("&amp;", "&")
            break
    return nome, href, maps


def scrape_listing(sess: requests.Session) -> dict[str, tuple[str, str, str]]:
    """nome_key -> (nome_listing, detalhe_url, maps_url)"""
    by_key: dict[str, tuple[str, str, str]] = {}
    for pg in range(1, 15):
        url = LISTING if pg == 1 else f"{LISTING.rstrip('/')}/page/{pg}/"
        html = fetch_html(url, sess)
        soup = BeautifulSoup(html, "html.parser")
        items = soup.select("div.item")
        if not items:
            break
        for it in items:
            row = parse_listing_item(it)
            if not row:
                continue
            nome_l, det, maps = row
            k = normalize_nome_key(nome_l)
            by_key[k] = (nome_l, det, maps)
        if len(items) < 12:
            break
        time.sleep(0.15)
    return by_key


def _petisco_from_soup(soup: BeautifulSoup) -> str:
    root = soup.select_one("article") or soup.select_one("main")
    if not root:
        return ""
    skip = re.compile(r"^(Endereço|Telefone|Horário|Horario)\s*:", re.I)
    paras = []
    for p in root.select("p"):
        t = norm_spaces(p.get_text())
        if t and not skip.match(t):
            paras.append(t)
    if not paras:
        return ""
    return max(paras, key=len)


def parse_detail_html(html: str, url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    nome = ""
    for sel in ("article h1", ".entry-content h1", "main h1", "h1"):
        h = soup.select_one(sel)
        if not h:
            continue
        t = norm_spaces(h.get_text())
        if t and t.lower() not in ("comida di buteco", "comidadibuteco.com.br"):
            nome = t
            break

    petisco = _petisco_from_soup(soup)
    if not petisco:
        meta = soup.select_one('meta[name="description"]')
        if meta and meta.get("content"):
            petisco = norm_spaces(meta["content"])

    endereco = ""
    cidade = "Belo Horizonte"
    estado = "MG"
    telefone_raw = ""
    horario = ""

    raw = html_module.unescape(html)

    def _label_value_from_psoup(label: str) -> str:
        lab = label.casefold().rstrip(":")
        for p in soup.find_all("p"):
            b = p.find(["b", "strong"])
            if not b:
                continue
            bl = norm_spaces(b.get_text()).casefold().rstrip(":")
            if bl == lab:
                clone = BeautifulSoup(str(p), "html.parser").p
                if clone:
                    for tag in clone.find_all(["b", "strong"]):
                        tag.decompose()
                    return norm_spaces(clone.get_text(" ", strip=True))
        return ""

    endereco = _label_value_from_psoup("Endereço") or _label_value_from_psoup("Endereco")
    if endereco:
        rest = endereco
        sep = "–" if "–" in rest else ("-" if " - " in rest else None)
        if sep:
            tail = rest.split(sep)[-1].strip()
            if "," in tail:
                parts = [p.strip() for p in tail.split(",")]
                if len(parts) >= 2:
                    cidade, estado = parts[0], parts[1]

    telefone_raw = _label_value_from_psoup("Telefone")
    horario = _label_value_from_psoup("Horário") or _label_value_from_psoup("Horario")

    if not endereco:
        m_end = re.search(
            r"Endere(?:ç|c)o:\s*</(?:b|strong)>\s*([^<]+)", raw, flags=re.I
        )
        if m_end:
            endereco = norm_spaces(m_end.group(1).strip())
            rest = endereco
            sep = "–" if "–" in rest else ("-" if " - " in rest else None)
            if sep:
                tail = rest.split(sep)[-1].strip()
                if "," in tail:
                    parts = [p.strip() for p in tail.split(",")]
                    if len(parts) >= 2:
                        cidade, estado = parts[0], parts[1]

    if not telefone_raw:
        m_tel = re.search(
            r"Telefone:\s*</(?:b|strong)>\s*([^<]+)", raw, flags=re.I
        )
        if m_tel:
            telefone_raw = norm_spaces(
                re.sub(r"</?span[^>]*>", "", m_tel.group(1), flags=re.I)
            )

    if not horario:
        m_hor = re.search(
            r"Hor[aá]rio:\s*</(?:b|strong)>\s*(.+?)(?=</p>)",
            raw,
            flags=re.I | re.S,
        )
        if not m_hor:
            m_hor = re.search(
                r"Horario:\s*</(?:b|strong)>\s*(.+?)(?=</p>)",
                raw,
                flags=re.I | re.S,
            )
        if m_hor:
            chunk = re.sub(r"</?span[^>]*>", "", m_hor.group(1), flags=re.I)
            horario = norm_spaces(chunk)

    imagem_url = ""
    og = soup.select_one('meta[property="og:image"]')
    if og and og.get("content"):
        imagem_url = norm_spaces(og["content"])
    low = imagem_url.lower()
    if not imagem_url or "img-buteco.png" in low or "logo" in low:
        for sel in (
            "article img.wp-post-image",
            ".wp-block-post-featured-image img",
            "article figure img",
        ):
            img = soup.select_one(sel)
            if img and img.get("src"):
                s = norm_spaces(img["src"])
                if s and "img-buteco" not in s.lower():
                    imagem_url = s
                    break
    if "img-buteco.png" in imagem_url.lower():
        imagem_url = ""

    maps_url = ""
    for a in soup.find_all("a", href=True):
        if re.match(r"^como chegar$", (a.get_text() or "").strip(), re.I):
            maps_url = norm_spaces(a["href"].replace("&amp;", "&"))
            break

    return {
        "nome": nome,
        "endereco": endereco,
        "cidade": cidade,
        "estado": estado,
        "detalhe_url": url.rstrip("/") + "/",
        "imagem_url": imagem_url,
        "petisco_descricao": petisco,
        "telefone": telefone_raw,
        "horario": horario,
        "maps_url": maps_url,
    }


def main() -> None:
    with open(ORIG, encoding="utf-8") as f:
        original = json.load(f)

    sess = requests.Session()
    listing = scrape_listing(sess)
    if len(listing) < 120:
        print(f"WARN: listagem com poucos itens: {len(listing)}", file=sys.stderr)

    detail_cache: dict[str, dict] = {}
    for _k, (nome_l, det_url, _maps_l) in listing.items():
        if det_url in detail_cache:
            continue
        try:
            html = fetch_html(det_url, sess)
            detail_cache[det_url] = parse_detail_html(html, det_url)
        except Exception as e:
            print(f"WARN fetch {det_url}: {e}", file=sys.stderr)
            detail_cache[det_url] = {
                "nome": "",
                "endereco": "",
                "cidade": "Belo Horizonte",
                "estado": "MG",
                "detalhe_url": det_url,
                "imagem_url": "",
                "petisco_descricao": "",
                "telefone": "",
                "horario": "",
                "maps_url": "",
            }
        time.sleep(0.08)

    final = []
    for orig in original:
        key = normalize_nome_key(orig.get("nome") or "")
        listing_row = listing.get(key)
        detail = None
        maps_from_listing = ""
        if listing_row:
            _nl, det_url, maps_from_listing = listing_row
            detail = detail_cache.get(det_url)

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
        petisco = normalize_nome_display(
            norm_spaces((detail.get("petisco_descricao") if detail else "") or "")
        )
        telefone = digits_only((detail.get("telefone") if detail else "") or "")
        horario = normalize_nome_display(
            norm_spaces((detail.get("horario") if detail else "") or "")
        )
        endereco = normalize_nome_display(endereco)
        maps_url = norm_spaces(
            (detail.get("maps_url") if detail else "") or maps_from_listing or ""
        )

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
    print(n)
    print(c_det)
    print(c_tel)
    print(c_hor)
    print(str(OUT_JSON))
    print(str(OUT_CSV))


if __name__ == "__main__":
    main()
