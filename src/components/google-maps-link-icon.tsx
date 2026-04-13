type GoogleMapsLinkIconProps = {
  size?: number;
  className?: string;
};

/** Ícone do produto Google Maps (PNG oficial em /public). Só em links para `mapsUrl`. */
export function GoogleMapsLinkIcon({ size = 20, className }: GoogleMapsLinkIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset estático em public/
    <img
      src="/google-maps-product.png"
      alt=""
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}
