import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";
const repoName = "clone-comida-di-buteco";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
  register: true,
  skipWaiting: true
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
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
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : ""
};

export default withPWA(nextConfig);
