import Image from "next/image";

const OFFICIAL_URL = "https://comidadibuteco.com.br/";

const OFFICIAL_SOCIAL = [
  {
    href: "https://www.youtube.com/user/canaldocomida",
    label: "YouTube do Comida di Buteco",
    icon: "youtube" as const
  },
  {
    href: "https://x.com/_comidadibuteco",
    label: "X (Twitter) do Comida di Buteco",
    icon: "x" as const
  },
  {
    href: "https://www.instagram.com/_comidadibuteco?short_redirect=1",
    label: "Instagram do Comida di Buteco",
    icon: "instagram" as const
  },
  {
    href: "https://www.facebook.com/comidadibuteco",
    label: "Facebook do Comida di Buteco",
    icon: "facebook" as const
  }
] as const;

/** Base path + arquivo em `public/` (GitHub Pages / export estático). */
export const officialBrandImageSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/comida-di-buteco-marca.png`;

type SocialIconId = (typeof OFFICIAL_SOCIAL)[number]["icon"];

function SocialIcon({ id }: { id: SocialIconId }) {
  const svg = { width: 22, height: 22, viewBox: "0 0 24 24" as const, "aria-hidden": true as const };
  switch (id) {
    case "youtube":
      return (
        <svg {...svg}>
          <path
            fill="currentColor"
            d="M23.5 6.3c-.3-1.1-1.1-1.9-2.2-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.3.6A3 3 0 0 0 .5 6.3C0 8 0 12 0 12s0 4 .5 5.7c.3 1.1 1 1.9 2.2 2.1 1.8.6 9.3.6 9.3.6s7.5 0 9.3-.6a3 3 0 0 0 2.2-2.1c.5-1.7.5-5.7.5-5.7s0-4-.5-5.7ZM9.6 15.4V8.6L16 12l-6.4 3.4Z"
          />
        </svg>
      );
    case "x":
      return (
        <svg {...svg}>
          <path
            fill="currentColor"
            d="m18.244 2.25 3.308 0-7.227 8.26 8.502 11.24h-6.413l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...svg}>
          <path
            fill="currentColor"
            d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.39H7.08V12h3.04V9.36c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.88V12h3.33l-.53 3.53h-2.8v8.39C19.61 23.02 24 18.06 24 12.07Z"
          />
        </svg>
      );
  }
}

export function OfficialBrandTab() {
  return (
    <section className="official-brand-tab official-brand-tab--cta" aria-labelledby="official-brand-heading">
      <div className="official-brand-tab-hero">
        <a
          href={OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="official-brand-tab-logo-link"
        >
          <Image
            src={officialBrandImageSrc}
            width={200}
            height={200}
            alt="Comida di Buteco — abrir site oficial"
            className="official-brand-tab-logo"
            unoptimized
          />
        </a>
        <nav className="official-brand-tab-social" aria-label="Redes sociais oficiais">
          {OFFICIAL_SOCIAL.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="official-brand-tab-social-link"
              aria-label={item.label}
            >
              <SocialIcon id={item.icon} />
            </a>
          ))}
        </nav>
        <h2 id="official-brand-heading" className="official-brand-tab-title">
          Site oficial
        </h2>
        <p className="official-brand-tab-lead">
          Tudo sobre o evento, regras e conteúdo institucional está em{" "}
          <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="official-brand-tab-inline-link">
            comidadibuteco.com.br
          </a>
          .
        </p>
      </div>

      <article className="official-brand-tab-disclaimer">
        <h3 className="official-brand-tab-disclaimer-title">Aviso legal e titularidade</h3>
        <p>
          Este aplicativo (<strong>Buteco Explorer</strong>) é um projeto <strong>independente e não oficial</strong>,
          criado por terceiros, <strong>sem vínculo societário, afiliação, endosso, patrocínio ou autorização</strong>{" "}
          do evento &quot;Comida di Buteco&quot;, de seus organizadores ou dos titulares de marcas e demais direitos
          conexos.
        </p>
        <p>
          <strong>Não há intenção de concorrer</strong> com o site oficial, aplicativos, campanhas comerciais,
          licenciamento ou qualquer outro canal do titular. A função aqui é meramente de conveniência local (exploração
          de lista/mapa), sem substituir fontes oficiais.
        </p>
        <p>
          As expressões <strong>&quot;Comida di Buteco&quot;</strong>, logotipos, identidade visual, fotografias,
          descrições de pratos, endereços e demais conteúdos exibidos podem constituir <strong>marca, obra ou dado de
          titularidade de terceiros</strong>, em especial do domínio{" "}
          <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="official-brand-tab-inline-link">
            comidadibuteco.com.br
          </a>{" "}
          e de quem detiver os direitos. Este projeto <strong>não reclama propriedade</strong> sobre tais elementos; os
          créditos e direitos permanecem com os respectivos titulares.
        </p>
        <p>
          As informações têm caráter meramente informativo, <strong>podem conter erros, estar incompletas ou
          desatualizadas</strong> e não configuram oferta, garantia de resultado ou relação de consumo com o evento
          oficial. O uso é por conta e risco do usuário, nos limites permitidos em lei.
        </p>
      </article>
    </section>
  );
}
