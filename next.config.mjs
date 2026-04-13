import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";
const repoName = "clone-comida-di-buteco";
const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "true";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true
});

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  basePath: isProd && isStaticExport ? `/${repoName}` : "",
  assetPrefix: isProd && isStaticExport ? `/${repoName}/` : ""
};

export default withPWA(nextConfig);
