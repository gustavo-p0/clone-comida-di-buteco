export type RatingValue = "like" | "dislike";

export type Bar = {
  id: string;
  slug: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  imagemUrl: string;
  fonteUrl: string;
  detalheUrl: string;
  petiscoDescricao: string;
  telefone: string;
  horario: string;
  mapsUrl: string;
  complemento?: string;
};

export type StoredRating = {
  barId: string;
  barName: string;
  rating: RatingValue;
  dishName: string;
  savedAt: string;
  lat: number | null;
  lng: number | null;
  imageUrl: string;
};
