type AppIconName =
  | "my-location"
  | "tune"
  | "close"
  | "chevron-down"
  | "chevron-left"
  | "favorite"
  | "thumb-down"
  | "map"
  | "map-pin"
  | "phone"
  | "clock"
  | "zoom"
  | "share"
  | "list"
  | "explore"
  | "visibility"
  | "star";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  className?: string;
};

const iconPaths: Record<Exclude<AppIconName, "visibility">, string> = {
  "my-location":
    "M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5zM12 10.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z",
  tune: "M3 17h6v2H3v-2Zm0-6h10v2H3v-2Zm0-6h14v2H3V5Zm12 12h6v2h-6v-2Zm-4-6h10v2H11v-2Zm8-6h2v2h-2V5Z",
  close: "M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.31-1.41-1.42L9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3z",
  "chevron-down": "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z",
  "chevron-left": "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  "map-pin":
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  phone:
    "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  clock:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
  zoom:
    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM13 10h-3v3H9v-3H6V9h3V6h1v3h3v1z",
  favorite:
    "M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A4.5 4.5 0 0 1 6.5 4c1.74 0 3.41.81 4.5 2.09A5.96 5.96 0 0 1 12 7.67a5.96 5.96 0 0 1 1-1.58A5.95 5.95 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.78-3.4 6.86-8.55 11.5z",
  "thumb-down":
    "M15 3H6a2 2 0 0 0-1.9 1.37L2 10v2h6.31l-1 4.57a2 2 0 0 0 .5 1.84L9 20l5.59-5.59A2 2 0 0 0 15 13V3Zm4 0h3v10h-3V3Z",
  map: "M15 5.5 9 3 3 5.5v15l6-2.5 6 2.5 6-2.5v-15zM9 16l-4 1.5V7l4-1.5V16Zm2 .5V5.5l4 1.5v11z",
  share:
    "M18 16a3 3 0 0 0-2.39 1.18L8.91 13.7a3.16 3.16 0 0 0 0-3.4l6.7-3.48a3 3 0 1 0-.92-1.77 2.69 2.69 0 0 0 .05.5L8.1 9a3 3 0 1 0 0 6l6.64 3.45a2.84 2.84 0 0 0-.05.55A3 3 0 1 0 18 16Z",
  list: "M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z",
  explore:
    "M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm2.94 7.06-2.12 5.3-5.3 2.12 2.12-5.3 5.3-2.12ZM12 13.1a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z",
  star:
    "m12 17.27 4.95 2.99-1.31-5.63L20 10.8l-5.76-.49L12 5l-2.24 5.31L4 10.8l4.36 3.83-1.31 5.63z"
};

export function AppIcon({ name, size = 18, className }: AppIconProps) {
  if (name === "visibility") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 12s3.8-6.25 9.5-6.25S21.5 12 21.5 12s-3.8 6.25-9.5 6.25S2.5 12 2.5 12z"
        />
        <circle cx="12" cy="12" r="2.75" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={iconPaths[name]} fill="currentColor" />
    </svg>
  );
}
