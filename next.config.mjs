/** @type {import('next').NextConfig} */

// 本番ビルド用の設定か開発用の設定かを環境変数で判断
const isProd = process.env.NODE_ENV === 'production';

// 環境に基づいてベースパスを決定する関数
function getBasePath() {
  // Vercel環境では空のベースパスを使用
  if (process.env.VERCEL) {
    console.log('Vercel環境を検出: ベースパス=""を使用');
    return '';
  }
  
  // GitHub Pages環境またはGitHub環境変数が設定されている場合
  if (process.env.NEXT_PUBLIC_BASE_PATH || 
      (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.includes('manaby-typing'))) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/manaby-typing';
    console.log(`GitHub Pages環境を検出: ベースパス="${basePath}"を使用`);
    return basePath;
  }
  
  // デフォルトは空のベースパス
  console.log('デフォルト環境: ベースパス=""を使用');
  return '';
}

// 共通のWebpack設定
const configureWebpack = (config, { isServer }) => {
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
};

// 環境に応じた設定
const nextConfig = {  // GitHub PagesとVercelどちらにも対応する設定
  basePath: getBasePath(),
  assetPrefix: getBasePath(),
  // 静的エクスポートの設定（本番環境のみ）
  ...(isProd ? { 
    output: 'export',
    // 静的エクスポート設定のカスタマイズ
    trailingSlash: true,
    images: {
      unoptimized: true,
    }
  } : {}),

  // Webpackの設定
  webpack: configureWebpack,

  // ヘッダー設定（静的エクスポート時は自動的に無視されるため削除）
  // 注: Web Workerを使う場合は、可能であれば別のサーバー設定でヘッダーを設定してください
};

export default nextConfig;
