#!/usr/bin/env python3
"""Scrape BH butecos from comidadibuteco.com.br (Cloudflare-friendly via Playwright)."""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

_ROOT = Path(__file__).resolve().parent
_BROWSERS = _ROOT / ".playwright-browsers"
if _BROWSERS.is_dir():
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(_BROWSERS)

BASE = "https://comidadibuteco.com.br"
LISTING = f"{BASE}/butecos/belo-horizonte/"


def listing_pairs(page):
    """Return [(detalhe_url, maps_url), ...] in page order."""
    return page.evaluate(
        """() => {
          const norm = (u) => {
            if (!u) return '';
            try {
              const x = new URL(u, location.origin);
              return x.href.split('#')[0].replace(/\\/+$/, '') + '/';
            } catch { return ''; }
          };
          const anchors = [...document.querySelectorAll('a')].filter((a) =>
            (a.textContent || '').trim().toLowerCase() === 'detalhes'
          );
          const out = [];
          for (const a of anchors) {
            const href = norm(a.getAttribute('href'));
            if (!href.includes('/buteco/') || href.includes('/butecos/')) continue;
            if (/revision/i.test(href)) continue;
            let maps = '';
            const card =
              a.closest('article') ||
              a.closest('.wp-block-post') ||
              a.closest('li') ||
              a.parentElement?.parentElement;
            if (card) {
              const m = [...card.querySelectorAll('a')].find((x) =>
                /como chegar/i.test((x.textContent || '').trim())
              );
              if (m) maps = m.href || '';
            }
            out.push([href, maps]);
          }
          return out;
        }"""
    )


def _petisco_from_dom(page) -> str:
    return page.evaluate(
        """() => {
          const root =
            document.querySelector('article') ||
            document.querySelector('main');
          if (!root) return '';
          const skip = (t) =>
            /^(Endereço|Telefone|Horário|Horario)\\s*:/i.test(t);
          const paras = [...root.querySelectorAll('p')]
            .map((p) => (p.innerText || '').trim())
            .filter(Boolean)
            .filter((t) => !skip(t));
          if (!paras.length) return '';
          return [...paras].sort((a, b) => b.length - a.length)[0];
        }"""
    ) or ""


def parse_detail(page, network_image_urls=None):
    url = page.url.rstrip("/") + "/"

    nome = ""
    for sel in ("article h1", ".entry-content h1", "main h1", "h1"):
        loc = page.locator(sel).first
        if loc.count():
            t = (loc.inner_text() or "").strip()
            if t and t.lower() not in ("comida di buteco", "comidadibuteco.com.br"):
                nome = t
                break

    petisco = (_petisco_from_dom(page) or "").strip()
    if not petisco:
        meta = page.locator('meta[name="description"]').first
        if meta.count():
            petisco = (meta.get_attribute("content") or "").strip()

    endereco = ""
    cidade = ""
    estado = ""
    telefone = ""
    horario = ""

    body = page.locator("body").inner_text()
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("Endereço:"):
            rest = line.replace("Endereço:", "").strip()
            endereco = rest
            if "–" in rest or "-" in rest:
                sep = "–" if "–" in rest else "-"
                tail = rest.split(sep)[-1].strip()
                if "," in tail:
                    parts = [p.strip() for p in tail.split(",")]
                    if len(parts) >= 2:
                        cidade = parts[0]
                        estado = parts[1]
                    else:
                        cidade = tail
        elif line.startswith("Telefone:"):
            telefone = line.replace("Telefone:", "").strip()
        elif line.startswith("Horario:") or line.startswith("Horário:"):
            horario = line.replace("Horario:", "").replace("Horário:", "").strip()

    if not cidade:
        cidade = "Belo Horizonte"
    if not estado:
        estado = "MG"

    imagem_url = ""
    og = page.locator('meta[property="og:image"]').first
    if og.count():
        imagem_url = (og.get_attribute("content") or "").strip()
    low = imagem_url.lower()
    if not imagem_url or "img-buteco.png" in low or "logo" in low:
        feat = page.locator(
            "article img.wp-post-image, .wp-block-post-featured-image img, article figure img"
        ).first
        if feat.count():
            s = (feat.get_attribute("src") or "").strip()
            if s and "img-buteco" not in s.lower():
                imagem_url = s
    if "img-buteco.png" in imagem_url.lower():
        imagem_url = ""

    if not imagem_url and network_image_urls:
        bad_sub = (
            "logo",
            "icon-",
            "/icons/",
            "sprite",
            "img-buteco",
            "placeholder",
            "favicon",
            "rodape",
            "footer",
            "header",
            "banner",
            "gravatar",
        )
        scored = []
        for u in network_image_urls:
            lu = u.lower()
            if "comidadibuteco.com.br" not in lu:
                continue
            if not any(lu.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")):
                if "/uploads/" not in lu and "wp-content" not in lu:
                    continue
            if any(b in lu for b in bad_sub):
                continue
            score = 0
            if "wp-content/uploads" in lu:
                score += 10
            if "upload" in lu:
                score += 3
            score += min(len(u), 200) // 50
            scored.append((score, u))
        if scored:
            scored.sort(key=lambda x: (-x[0], -len(x[1])))
            imagem_url = scored[0][1]

    return {
        "nome": nome,
        "endereco": endereco,
        "cidade": cidade,
        "estado": estado,
        "detalhe_url": url,
        "imagem_url": imagem_url,
        "petisco_descricao": petisco,
        "telefone": telefone,
        "horario": horario,
        "maps_url": "",
    }


def _image_response_collector():
    seen = set()
    urls = []

    def on_response(response):
        try:
            ct = (response.headers or {}).get("content-type", "") or ""
            if "image" not in ct.lower():
                return
            u = response.url
            if u in seen:
                return
            seen.add(u)
            urls.append(u)
        except Exception:
            pass

    return on_response, urls


def scrape_all():
    detail_maps = {}
    ordered = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            locale="pt-BR",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        page = context.new_page()
        for pg in range(1, 12):
            url = LISTING if pg == 1 else f"{LISTING.rstrip('/')}/page/{pg}/"
            page.goto(url, wait_until="domcontentloaded", timeout=90_000)
            try:
                page.wait_for_selector("text=Butecos para você visitar", timeout=90_000)
            except Exception:
                page.wait_for_timeout(8000)
            try:
                page.wait_for_function(
                    """() => [...document.querySelectorAll('a')].filter((a) =>
                      (a.textContent || '').trim().toLowerCase() === 'detalhes' &&
                      (a.getAttribute('href') || '').includes('/buteco/') &&
                      !/revision/i.test(a.getAttribute('href') || '')
                    ).length >= 4""",
                    timeout=25_000,
                )
            except Exception:
                pass
            page.wait_for_timeout(3000)
            pairs = listing_pairs(page)
            for det_url, maps_u in pairs:
                detail_maps[det_url] = maps_u.replace("&amp;", "&")
                if det_url not in ordered:
                    ordered.append(det_url)

        out = []
        for u in ordered:
            handler, net_imgs = _image_response_collector()
            page.on("response", handler)
            try:
                page.goto(u, wait_until="domcontentloaded", timeout=90_000)
                page.locator("h1").first.wait_for(state="visible", timeout=30_000)
                page.wait_for_timeout(1200)
            finally:
                page.remove_listener("response", handler)

            data = parse_detail(page, network_image_urls=list(net_imgs))
            data["maps_url"] = detail_maps.get(u, "") or data["maps_url"]
            if not data["maps_url"]:
                m = page.get_by_role("link", name=re.compile(r"^Como chegar$", re.I)).first
                if m.count():
                    h = (m.get_attribute("href") or "").strip()
                    if h.startswith("http"):
                        data["maps_url"] = h
            out.append(data)

        browser.close()

    return out


def main():
    out = scrape_all()
    if len(out) != 127:
        print(f"WARN: expected 127 got {len(out)}", file=sys.stderr)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
