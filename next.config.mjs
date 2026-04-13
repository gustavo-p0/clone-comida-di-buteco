import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";
const repoName = "clone-comida-di-buteco";
const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "true";
const publicBasePath = isProd && isStaticExport ? `/${repoName}` : "";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: publicBasePath
  },
  output: isStaticExport ? "export" : undefined,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdb-static-files.s3.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "comidadibuteco.com.br"
      }
    ]
  },
  basePath: publicBasePath,
  assetPrefix: publicBasePath ? `${publicBasePath}/` : ""
};

export default withPWA(nextConfig);
