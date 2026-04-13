"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { GoogleMapsLinkIcon } from "@/components/google-maps-link-icon";
import { ImageModal } from "@/components/image-modal";
import { appendBarIdToRouteDraft } from "@/lib/route-draft-storage";
import { readRatings, saveRatings } from "@/lib/rating-storage";
import { Bar, RatingValue, StoredRating } from "@/types/bar";

// Splits "DishName Description text" into { name, desc }
function parseDish(text: string): { name: string; desc: string } {
  if (!text) return { name: "", desc: "" };
  const PREPS = new Set(["de", "do", "da", "dos", "das", "ao", "à", "e", "com", "no", "na"]);
  const words = text.split(" ");
  let capsCount = 0;
  let cut = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/[",;.:""'']/g, "");
    const startsUpper = w.length > 0 && w[0] !== w[0].toLowerCase();
    if (startsUpper) {
      capsCount++;
      cut = i + 1;
      if (capsCount >= 2) break;
    } else if (!PREPS.has(w.toLowerCase())) {
      break;
    }
  }
  // trim trailing prepositions from name
  while (cut > 1 && PREPS.has((words[cut - 1] ?? "").replace(/[",;.:""'']/g, "").toLowerCase())) {
    cut--;
  }
  return { name: words.slice(0, cut).join(" "), desc: words.slice(cut).join(" ") };
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function telHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d ? `tel:${d}` : "#";
}

/** Separa vários telefones no mesmo campo (|, /, ;, quebra de linha, " e ", vírgula entre números). */
function splitTelephones(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];

  const pass1 = s
    .split(/\s*(?:\||\n+|\r\n|;\s*|\s+e\s+)\s*/i)
    .map((x) => x.trim())
    .filter(Boolean);

  const chunks = pass1.length ? pass1 : [s];
  const out: string[] = [];

  for (const chunk of chunks) {
    const slashParts = chunk.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
    const toCommaSplit = slashParts.length > 1 ? slashParts : [chunk];

    for (const part of toCommaSplit) {
      const commaParts = part.split(/,(?=\s*\(?\d)/);
      for (const p of commaParts) {
        const t = p.replace(/^\s*\/\s*|\s*\/\s*$/g, "").trim();
        if (t) out.push(t);
      }
    }
  }

  return out.length ? out : [s];
}

function parseHorario(horario: string) {
  return horario.split("|").map((entry) => {
    const idx = entry.indexOf(":");
    if (idx === -1) return { day: entry.trim(), time: "" };
    return { day: entry.slice(0, idx).trim(), time: entry.slice(idx + 1).trim() };
  });
}

type BarDetailsClientProps = { bar: Bar };

function isReturnToSharedRoteiro(path: string): boolean {
  let p = path.trim();
  try {
    for (let i = 0; i < 2 && p.includes("%"); i += 1) {
      p = decodeURIComponent(p);
    }
  } catch {
    /* keep p */
  }
  return /^\/roteiro\/[^/?#]+$/.test(p);
}

export function BarDetailsClient({ bar }: BarDetailsClientProps) {
  const searchParams = useSearchParams();
  const [ratings, setRatings] = useState<StoredRating[]>(() => readRatings());
  const [showImage, setShowImage] = useState(false);

  const fromRaw = searchParams.get("from");
  const backHref = useMemo(() => {
    if (!fromRaw || !fromRaw.startsWith("/") || fromRaw.startsWith("//")) {
      return "/";
    }
    return fromRaw;
  }, [fromRaw]);

  const returnToRoteiro = useMemo(() => isReturnToSharedRoteiro(backHref), [backHref]);

  const recRaw = searchParams.get("rec");
  const isRecommendationLink = useMemo(
    () => recRaw === "1" || recRaw === "true" || recRaw === "recommend",
    [recRaw]
  );

  const currentRating = useMemo(
    () => ratings.find((item) => item.barId === bar.id)?.rating,
    [bar.id, ratings]
  );

  const dish = useMemo(() => parseDish(bar.petiscoDescricao), [bar.petiscoDescricao]);
  const horarios = useMemo(
    () => (bar.horario ? parseHorario(bar.horario) : []),
    [bar.horario]
  );

  function rate(rating: RatingValue) {
    if (currentRating === rating) {
      const cleared = ratings.filter((item) => item.barId !== bar.id);
      setRatings(cleared);
      saveRatings(cleared);
      return;
    }
    const next = [
      ...ratings.filter((item) => item.barId !== bar.id),
      {
        barId: bar.id,
        barName: bar.nome,
        rating,
        dishName: bar.petiscoDescricao,
        savedAt: new Date().toISOString(),
        lat: bar.latitude,
        lng: bar.longitude,
        imageUrl: bar.imagemUrl,
      },
    ];
    setRatings(next);
    saveRatings(next);
    appendBarIdToRouteDraft(bar.id);
  }

  return (
    <div className={`details-root${returnToRoteiro ? " details-root--route-return" : ""}`}>
      <div className={`details-top-sticky${returnToRoteiro ? " details-top-sticky--route-return" : ""}`}>
        <header className="details-top-bar">
          <Link
            href={backHref}
            className="details-back-btn"
            aria-label={returnToRoteiro ? "Voltar ao roteiro" : "Voltar"}
          >
            <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>
          <span className="details-top-title">{bar.nome}</span>
          <div className="details-top-spacer" aria-hidden="true" />
        </header>
        {returnToRoteiro ? (
          <div className="details-route-return-inner">
            <Link href={backHref} className="details-route-return-link">
              <AppIcon name="explore" size={20} />
              <span>Voltar ao roteiro</span>
            </Link>
          </div>
        ) : null}
      </div>

      {/* ── Hero image ────────────────────────────────────── */}
      <div className="details-hero">
        <button
          className="details-hero-btn"
          onClick={() => setShowImage(true)}
          aria-label={`Ampliar foto de ${bar.nome}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bar.imagemUrl} alt={bar.nome} className="details-hero-img" />
        </button>
        <div className="details-hero-overlay" aria-hidden="true">
          <span className="details-dish-label">FEATURED DISH</span>
          <button
            className="details-zoom-btn"
            onClick={() => setShowImage(true)}
            aria-label="Ampliar imagem"
            tabIndex={-1}
          >
            <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden="true">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Recommendation badge ─────────────────────────── */}
      {isRecommendationLink ? (
        <div className="details-rec-badge">⭐ Recomendado para você</div>
      ) : null}

      {/* ── Featured dish ─────────────────────────────────── */}
      <div className="details-dish-quote">
        {dish.name && <p className="details-dish-name">{dish.name}</p>}
        <p>&ldquo;{dish.desc || bar.petiscoDescricao}&rdquo;</p>
      </div>

      {/* ── Info blocks ───────────────────────────────────── */}
      <div className="details-info-list">
        {/* Address */}
        <div className="details-info-block">
          <div className="details-info-label">
            <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" />
            </svg>
            <span>Endereço</span>
          </div>
          <p className="details-info-value">{bar.endereco}</p>
          {bar.complemento ? <p className="details-info-sub">{bar.complemento}</p> : null}
        </div>

        {/* Phone */}
        {bar.telefone ? (
          <div className="details-info-block">
            <div className="details-info-label">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02L6.62 10.79z" />
              </svg>
              <span>Telefone</span>
            </div>
            <div className="details-phone-list">
              {splitTelephones(bar.telefone).map((line, i) => (
                <a
                  key={i}
                  href={telHref(line)}
                  className="details-info-value details-info-phone details-info-phone-link details-info-block-link"
                >
                  {formatPhone(line)}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Hours */}
        {horarios.length > 0 ? (
          <div className="details-info-block">
            <div className="details-info-label">
              <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
              </svg>
              <span>Horário de Funcionamento</span>
            </div>
            <div className="details-horario-grid">
              {horarios.map(({ day, time }, i) => (
                <div key={i} className="details-horario-row">
                  <span className="details-horario-day">{day}</span>
                  <span className="details-horario-time">{time}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Fixed bottom actions ──────────────────────────── */}
      <footer className="details-actions">
        <button
          className={`card-icon-btn ${currentRating === "like" ? "active-like" : ""}`}
          onClick={() => rate("like")}
          aria-label="Curtir"
        >
          <AppIcon name="favorite" size={20} />
        </button>
        <button
          className={`card-icon-btn ${currentRating === "dislike" ? "active-dislike" : ""}`}
          onClick={() => rate("dislike")}
          aria-label="Não curtir"
        >
          <AppIcon name="thumb-down" size={20} />
        </button>
        <a
          href={bar.mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="maps-cta details-maps-full"
        >
          <GoogleMapsLinkIcon size={20} className="google-maps-link-icon" />
          Google Maps
        </a>
      </footer>

      {showImage ? (
        <ImageModal imageUrl={bar.imagemUrl} title={bar.nome} onClose={() => setShowImage(false)} />
      ) : null}
    </div>
  );
}

