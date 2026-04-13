# Playwright Web Scraping Skill

## Visão Geral

Este skill cobre scraping com Playwright para **todos os tipos de renderização**:
- **SSR** (Server-Side Rendering): HTML já vem pronto do servidor (ex: sites em PHP, Rails, Django, Next.js SSR)
- **CSR/SPA** (Client-Side Rendering / Single Page App): conteúdo renderizado via JavaScript no browser (ex: React, Vue, Angular)
- **Hybrid** (Next.js, Nuxt, SvelteKit): SSR inicial + hidratação no cliente
- **Lazy Loading / Infinite Scroll**: conteúdo carregado sob demanda
- **Páginas protegidas por auth / CAPTCHAs / anti-bot**

---

## Instalação

```bash
pip install playwright --break-system-packages
playwright install chromium   # ou firefox, webkit
```

---

## Estrutura Base do Scraper

```python
from playwright.sync_api import sync_playwright, Page, BrowserContext
import json, time

def make_browser(headless=True, slow_mo=0):
    """Retorna playwright, browser e context prontos para uso."""
    pw = sync_playwright().start()
    browser = pw.chromium.launch(
        headless=headless,
        slow_mo=slow_mo,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
        ]
    )
    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        ),
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
        # Desabilita WebDriver flag (anti-bot básico)
        java_script_enabled=True,
    )
    # Remove navigator.webdriver
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    """)
    return pw, browser, context
```

---

## Estratégias por Tipo de Renderização

### 1. SSR — Conteúdo Estático (HTML pronto no servidor)

O HTML já está disponível antes de qualquer JS rodar. Use `wait_until="domcontentloaded"` para máxima velocidade.

```python
def scrape_ssr(url: str) -> str:
    pw, browser, context = make_browser()
    page = context.new_page()
    
    # domcontentloaded é suficiente para SSR puro
    page.goto(url, wait_until="domcontentloaded", timeout=15_000)
    
    html = page.content()
    
    # Extração de dados
    title   = page.title()
    heading = page.locator("h1").first.text_content()
    items   = page.locator("ul.product-list li").all_text_contents()
    
    browser.close()
    pw.stop()
    return {"title": title, "heading": heading, "items": items}
```

### 2. CSR / SPA — Conteúdo renderizado por JavaScript

O HTML inicial é quase vazio; o conteúdo aparece depois que o JS executa. Aguarde elementos específicos.

```python
def scrape_spa(url: str) -> dict:
    pw, browser, context = make_browser()
    page = context.new_page()

    # networkidle aguarda todas as requisições terminarem
    page.goto(url, wait_until="networkidle", timeout=30_000)

    # Aguarda seletor específico aparecer no DOM
    page.wait_for_selector("[data-testid='product-card']", timeout=15_000)

    products = []
    cards = page.locator("[data-testid='product-card']").all()
    for card in cards:
        products.append({
            "name":  card.locator(".product-name").text_content(timeout=5_000),
            "price": card.locator(".product-price").text_content(timeout=5_000),
        })

    browser.close()
    pw.stop()
    return products
```

### 3. Hybrid (Next.js / Nuxt / SvelteKit)

SSR traz o HTML inicial, mas links e dados adicionais são carregados via fetch do cliente.

```python
def scrape_hybrid(url: str) -> dict:
    pw, browser, context = make_browser()
    page = context.new_page()

    # Intercepta requests de API feitas pelo app
    api_responses = []
    def capture_api(response):
        if "/api/" in response.url and response.status == 200:
            try:
                api_responses.append(response.json())
            except Exception:
                pass
    page.on("response", capture_api)

    page.goto(url, wait_until="networkidle", timeout=30_000)

    # Aguarda hidratação: espera elemento que só existe após JS rodar
    page.wait_for_function("() => window.__NEXT_DATA__ !== undefined", timeout=10_000)

    # Extrai dados do __NEXT_DATA__ (Next.js)
    next_data = page.evaluate("() => window.__NEXT_DATA__")

    # Dados do DOM (pós-hidratação)
    dom_data = page.locator("main").text_content()

    browser.close()
    pw.stop()
    return {"next_data": next_data, "dom": dom_data, "api_calls": api_responses}
```

### 4. Lazy Loading / Infinite Scroll

Conteúdo carregado à medida que o usuário rola a página.

```python
def scrape_infinite_scroll(url: str, max_items: int = 100) -> list:
    pw, browser, context = make_browser()
    page = context.new_page()
    page.goto(url, wait_until="networkidle", timeout=30_000)

    collected = set()
    previous_count = 0
    stale_rounds = 0

    while len(collected) < max_items and stale_rounds < 3:
        # Coleta itens visíveis
        items = page.locator(".item-card").all_text_contents()
        collected.update(items)

        if len(collected) == previous_count:
            stale_rounds += 1
        else:
            stale_rounds = 0
        previous_count = len(collected)

        # Rola até o fim da página
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        
        # Aguarda novos itens carregarem
        try:
            page.wait_for_function(
                f"document.querySelectorAll('.item-card').length > {len(collected)}",
                timeout=5_000
            )
        except Exception:
            stale_rounds += 1

    browser.close()
    pw.stop()
    return list(collected)[:max_items]
```

### 5. Paginação Clássica

```python
def scrape_paginated(base_url: str, max_pages: int = 10) -> list:
    pw, browser, context = make_browser()
    page = context.new_page()
    all_data = []

    for page_num in range(1, max_pages + 1):
        url = f"{base_url}?page={page_num}"
        page.goto(url, wait_until="domcontentloaded", timeout=15_000)

        # Verifica se há conteúdo na página
        items = page.locator(".listing-item").all()
        if not items:
            break  # Sem mais resultados

        for item in items:
            all_data.append({
                "title": item.locator("h2").text_content(),
                "link":  item.locator("a").get_attribute("href"),
            })

        # Verifica se existe botão "próxima página"
        next_btn = page.locator("a[rel='next']")
        if not next_btn.count():
            break

    browser.close()
    pw.stop()
    return all_data
```

---

## Interceptação de Rede (o melhor truque para SPAs)

Muitas SPAs fazem chamadas de API internas — capturar essas respostas JSON é mais eficiente e estável do que parsear o DOM.

```python
def scrape_via_api_interception(url: str) -> list:
    pw, browser, context = make_browser()
    page = context.new_page()

    captured = []

    # Aguarda resposta específica de API
    with page.expect_response(
        lambda r: "api/products" in r.url and r.status == 200
    ) as response_info:
        page.goto(url, wait_until="domcontentloaded")

    response = response_info.value
    data = response.json()
    captured = data.get("results", data)

    browser.close()
    pw.stop()
    return captured
```

---

## Formulários, Busca e Interação

```python
def scrape_with_search(url: str, query: str) -> list:
    pw, browser, context = make_browser(headless=False)  # False para debug
    page = context.new_page()
    page.goto(url, wait_until="domcontentloaded")

    # Preenche campo de busca
    page.locator("input[name='q']").fill(query)
    page.keyboard.press("Enter")

    # Aguarda resultados
    page.wait_for_selector(".search-result", timeout=15_000)
    page.wait_for_load_state("networkidle")

    results = []
    for item in page.locator(".search-result").all():
        results.append(item.text_content().strip())

    browser.close()
    pw.stop()
    return results
```

---

## Autenticação

### Login por formulário

```python
def login_and_scrape(login_url: str, target_url: str,
                     username: str, password: str) -> str:
    pw, browser, context = make_browser()
    page = context.new_page()

    page.goto(login_url, wait_until="domcontentloaded")
    page.locator("input[name='email']").fill(username)
    page.locator("input[name='password']").fill(password)
    page.locator("button[type='submit']").click()
    page.wait_for_url("**/dashboard**", timeout=15_000)

    # Salva cookies/sessão para reuso
    context.storage_state(path="auth_state.json")

    page.goto(target_url, wait_until="networkidle")
    data = page.locator("main").inner_html()

    browser.close()
    pw.stop()
    return data

def scrape_with_saved_auth(url: str, state_path="auth_state.json") -> str:
    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    # Restaura sessão autenticada
    context = browser.new_context(storage_state=state_path)
    page = context.new_page()
    page.goto(url, wait_until="networkidle")
    data = page.content()
    browser.close()
    pw.stop()
    return data
```

---

## Anti-Bot e Técnicas de Evasão

```python
def make_stealth_browser():
    """Browser com máxima evasão de detecção."""
    pw = sync_playwright().start()
    browser = pw.chromium.launch(
        headless=True,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-infobars",
        ]
    )
    context = browser.new_context(
        viewport={"width": 1366, "height": 768},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
        geolocation={"latitude": -23.5505, "longitude": -46.6333},  # São Paulo
        permissions=["geolocation"],
    )
    context.add_init_script("""
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // Finge ter plugins reais
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        // Finge ter linguagens reais
        Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
        // Esconde Headless no User-Agent
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    """)
    return pw, browser, context


def human_delay(min_ms=500, max_ms=2000):
    """Pausa aleatória para simular comportamento humano."""
    import random
    time.sleep(random.uniform(min_ms / 1000, max_ms / 1000))


def type_like_human(page: Page, selector: str, text: str):
    """Digita caractere por caractere com delays aleatórios."""
    page.locator(selector).click()
    for char in text:
        page.keyboard.type(char)
        human_delay(50, 200)
```

---

## Coleta de Dados Estruturados

```python
from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class Product:
    name: str
    price: Optional[str]
    url: str
    image: Optional[str]
    rating: Optional[str]

def extract_product(card) -> Product:
    return Product(
        name   = safe_text(card, "h2, .product-title, [class*='name']"),
        price  = safe_text(card, "[class*='price'], .price"),
        url    = safe_attr(card, "a", "href"),
        image  = safe_attr(card, "img", "src"),
        rating = safe_text(card, "[class*='rating'], [class*='star']"),
    )

def safe_text(locator, selector: str, default="") -> str:
    try:
        el = locator.locator(selector).first
        if el.count():
            return el.text_content().strip()
    except Exception:
        pass
    return default

def safe_attr(locator, selector: str, attr: str, default="") -> str:
    try:
        el = locator.locator(selector).first
        if el.count():
            return el.get_attribute(attr) or default
    except Exception:
        pass
    return default
```

---

## Screenshot e Debug

```python
def debug_page(page: Page, prefix="debug"):
    """Salva screenshot e HTML para diagnóstico."""
    page.screenshot(path=f"{prefix}.png", full_page=True)
    with open(f"{prefix}.html", "w", encoding="utf-8") as f:
        f.write(page.content())
    print(f"[debug] Saved {prefix}.png e {prefix}.html")
```

---

## Scraping Assíncrono (alto volume)

```python
import asyncio
from playwright.async_api import async_playwright

async def scrape_url_async(url: str, context) -> dict:
    page = await context.new_page()
    await page.goto(url, wait_until="networkidle", timeout=30_000)
    title = await page.title()
    await page.close()
    return {"url": url, "title": title}

async def scrape_many(urls: list, concurrency: int = 5) -> list:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context()
        semaphore = asyncio.Semaphore(concurrency)

        async def bounded(url):
            async with semaphore:
                return await scrape_url_async(url, context)

        results = await asyncio.gather(*[bounded(u) for u in urls])
        await browser.close()
    return results

# Executa:
# results = asyncio.run(scrape_many(["https://...", "https://..."], concurrency=5))
```

---

## Decisão: qual wait_until usar?

| Situação                              | `wait_until`       | Nota                                    |
|---------------------------------------|--------------------|-----------------------------------------|
| SSR puro (HTML estático)              | `domcontentloaded` | Mais rápido                             |
| SPA (React, Vue, Angular)             | `networkidle`      | Aguarda XHR/fetch terminarem            |
| Hybrid com hidratação                 | `networkidle`      | + `wait_for_selector` no elemento alvo |
| Lazy load / scroll                    | `domcontentloaded` | Controle manual do scroll               |
| API interception                      | `domcontentloaded` | Captura antes de todo JS rodar          |

---

## Checklist antes de fazer scraping

- [ ] O site é SSR ou SPA? (inspecione o HTML inicial no DevTools > Network > Doc)
- [ ] Há autenticação necessária?
- [ ] O site usa rate limiting / CAPTCHA?
- [ ] Os dados estão no DOM ou em chamadas de API?
- [ ] Precisa de paginação ou scroll infinito?
- [ ] Qual o seletor mais estável? (prefer `data-*` > `id` > class semântica)
- [ ] Está usando `async` para scraping em paralelo?

---

## Exemplo Completo: E-commerce Genérico

```python
import json
from playwright.sync_api import sync_playwright

def scrape_ecommerce(url: str) -> list:
    pw, browser, context = make_stealth_browser()
    page = context.new_page()
    products = []

    try:
        page.goto(url, wait_until="networkidle", timeout=30_000)
        human_delay(1000, 2000)

        # Tenta interceptar API de produtos
        # Caso falhe, cai para DOM scraping
        cards = page.locator("[class*='product'], [data-type='product'], article").all()

        if not cards:
            debug_page(page, "ecommerce_debug")
            raise Exception("Nenhum card encontrado. Verifique debug.png")

        for card in cards:
            products.append(asdict(extract_product(card)))

    finally:
        browser.close()
        pw.stop()

    return products

if __name__ == "__main__":
    data = scrape_ecommerce("https://exemplo.com/produtos")
    print(json.dumps(data, ensure_ascii=False, indent=2))
```
