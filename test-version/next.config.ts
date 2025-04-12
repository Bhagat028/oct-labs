import type { NextConfig } from "next";
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { dev, isServer }) => {
    // Only use MiniCssExtractPlugin on the client side in production
    if (!isServer && !dev) {
      config.plugins = [...(config.plugins || []), new MiniCssExtractPlugin({
        filename: 'static/css/[contenthash].css',
        chunkFilename: 'static/css/[contenthash].css',
      })];
    }
    
    return config;
  },
};

export default nextConfig;