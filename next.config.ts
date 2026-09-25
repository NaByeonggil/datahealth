import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용 — .next/standalone 에 실행에 필요한 것만 모은다
  output: "standalone",
};

export default nextConfig;
