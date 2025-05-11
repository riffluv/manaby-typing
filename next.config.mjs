/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Web Workerをサポートするための設定
    config.module.rules.push({
      test: /\.(worker|typing-worker)\.js$/,
      use: {
        loader: 'worker-loader',
        options: {
          filename: 'static/chunks/workers/[name].[contenthash].js',
          publicPath: '/_next/',
          // インラインワーカーは無効化（公開サーバー環境向け）
          inline: 'no-fallback',
        },
      },
    });

    // Worker用のglobalオブジェクトを定義
    if (!isServer) {
      config.output.globalObject = 'self';
    }

    return config;
  },
  // Web Workerの安全な利用のためのヘッダーを設定
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
      ],
    },
  ],
};

export default nextConfig;
