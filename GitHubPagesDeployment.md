# GitHub Pages デプロイガイド

このガイドでは、Next.js プロジェクトを GitHub Pages にデプロイするための手順と注意点を説明します。

## 設定の概要

1. `.gitignore`に`.env.local`を追加し、環境変数をリポジトリにコミットしないようにしています
2. `next.config.mjs`に`basePath`と`assetPrefix`を追加し、GitHub Pages でのパスを設定しています
3. `package.json`にビルドとデプロイ用のスクリプトを追加しています
4. 画像やその他の静的ファイルの参照には`getStaticPath`ユーティリティを使用しています
5. GitHub Actions による自動デプロイを設定しています

## 静的アセットの参照方法

プロジェクト内で画像などの静的アセットを参照する際は、次の形式を使用してください：

```jsx
// コンポーネントの先頭でインポート
import { getStaticPath } from '../utils/StaticPathUtils';

// imgタグを使う場合
<img src={getStaticPath('/images/sample.png')} alt="Sample" />

// Next.jsのImageコンポーネントを使う場合
<Image
  src={getStaticPath('/images/sample.png')}
  alt="Sample"
  width={200}
  height={200}
/>

// CSSでの背景画像など
style={{backgroundImage: `url(${getStaticPath('/images/background.jpg')})`}}
```

## 環境変数の設定

開発環境と本番環境で異なる設定を行う場合には、環境変数を使用します：

- `.env.development`: 開発環境用
- `.env.production`: 本番環境用（GitHub Pages）

特に`NEXT_PUBLIC_BASE_PATH`は GitHub Pages のリポジトリ名に合わせて設定する必要があります。

## デプロイ手順

1. リポジトリを GitHub にプッシュします
2. GitHub Actions が自動的にビルドとデプロイを行います
3. リポジトリの Settings > Pages からデプロイの設定を確認します

または、手動でデプロイする場合：

```bash
npm run deploy
```

## 注意点

- 画像やアセットファイルには必ず `getStaticPath` を使用してください
- GitHub Pages の URL は `https://ユーザー名.github.io/リポジトリ名/` となります
- `リポジトリ名` と `.env.production` の `NEXT_PUBLIC_BASE_PATH` 値が一致している必要があります
