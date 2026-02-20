import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? "/wads-filtering" : "",
  assetPrefix: isGithubPages ? "/wads-filtering/" : "",
};

export default nextConfig;
