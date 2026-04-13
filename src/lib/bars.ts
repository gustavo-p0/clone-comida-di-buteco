import rawBars from "../../output/bares_bh_detalhado_geo.json";
import { Bar } from "@/types/bar";
import { slugify } from "@/lib/slug";

type RawBar = {
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  imagem_url: string;
  fonte_url: string;
  detalhe_url: string;
  petisco_descricao: string;
  telefone: string | number;
  horario: string;
  maps_url: string;
  complemento?: string;
};

const barsWithId: Bar[] = (rawBars as RawBar[]).map((bar, index) => {
  const baseSlug = slugify(bar.nome) || `bar-${index + 1}`;
  const slug = `${baseSlug}-${index + 1}`;
  return {
    id: `${index + 1}`,
    slug,
    nome: bar.nome,
    endereco: bar.endereco,
    cidade: bar.cidade,
    estado: bar.estado,
    latitude: bar.latitude ?? null,
    longitude: bar.longitude ?? null,
    imagemUrl: bar.imagem_url,
    fonteUrl: bar.fonte_url,
    detalheUrl: bar.detalhe_url,
    petiscoDescricao: bar.petisco_descricao,
    telefone: String(bar.telefone ?? ""),
    horario: bar.horario,
    mapsUrl: bar.maps_url,
    complemento: bar.complemento
  };
});

export function getBars(): Bar[] {
  return barsWithId;
}

export function getBarBySlug(slug: string): Bar | undefined {
  return barsWithId.find((bar) => bar.slug === slug);
}
