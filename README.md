# タイピングゲーム制作プロジェクト

このプロジェクトは Next.js を使用したタイピングゲームの開発リポジトリです。高速なタイピング体験と最適化されたパフォーマンスを提供するWeb上のタイピングゲームです。

## 開発ルール

### コーディング規約

1. **BEM 記法を厳守する**

   - Block（ブロック）: 独立したコンポーネント `.header`, `.card`
   - Element（要素）: ブロックの一部 `.header__title`, `.card__image`

   - Modifier（修飾子）: ブロックや要素のバリエーション `.header--fixed`, `.button--large`
   - 例: `.typing-game__score--highlight`

2. **インラインスタイルは使用禁止**
   - すべてのスタイルは CSS モジュールまたは SCSS ファイルに記述する
   - `style`属性を直接使用しない

### プロジェクト固有のルール

1. **コンポーネント設計**

   - 機能ごとに再利用可能なコンポーネントを作成する
   - コンポーネントは`src/components`ディレクトリに配置する
   - 各コンポーネントは独自の CSS モジュールファイルを持つ

2. **状態管理**

   - シンプルな状態は React の useState を使用
   - 複雑な状態管理が必要な場合は ContextAPI または Redux を検討

3. **タイピングゲーム特有の注意点**
   - キー入力のパフォーマンスを最適化する
   - アクセシビリティに配慮（キーボードナビゲーション、色のコントラスト等）
   - レスポンシブデザインを実装し、様々なデバイスに対応する

## 主な機能

1. タイピング練習モード
2. スコア管理システム
3. 難易度設定
4. 進捗トラッキング

## パフォーマンス最適化

このタイピングゲームは、さまざまなリフレッシュレートのディスプレイで最適な体験を提供するよう設計されています：

- **高リフレッシュレートモニター対応**: 60Hz、120Hz、144Hz、240Hz 等の高リフレッシュレートモニターでも入力遅延なく快適にプレイ可能
- **入力処理の最適化**: queueMicrotask を活用した即時フィードバック処理の実装
- **レンダリングパフォーマンス**: 不要な再レンダリングを最小限に抑える最適化設計
- **バッファリング戦略**: 高速タイピング時にも安定した動作を実現する動的バッファリング

## 開発環境構築

開発サーバーを起動するには：

```bash
npm run dev
# または
yarn dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いて結果を確認できます。

## ディレクトリ構造

```
src/
  app/          # Next.jsのアプリケーションルート
  components/   # 再利用可能なコンポーネント
  styles/       # グローバルスタイルとコンポーネント固有のスタイル
  utils/        # ユーティリティ関数
  hooks/        # カスタムReactフック
  constants/    # 定数定義
```

## インストール方法

このプロジェクトを実行するには、以下のステップに従ってください：

1. リポジトリをクローンします

```bash
git clone https://github.com/riffluv/manaby-typing.git
cd manaby-typing
```

2. 依存パッケージをインストールします

```bash
npm install
# または
yarn install
```

3. 開発サーバーを起動します

```bash
npm run dev
# または
yarn dev
```

4. ブラウザで http://localhost:3000 を開いてアプリケーションを表示します

## GitHub Pages へのデプロイ手順

このタイピングゲームを GitHub Pages にデプロイするには、以下の手順に従ってください：

1. プロジェクトをビルドします

```bash
npm run build
# または
yarn build
```

2. `.env.production`ファイルにリポジトリ名が正しく設定されていることを確認します

```
NEXT_PUBLIC_BASE_PATH=/あなたのリポジトリ名
```

3. GitHub Actions を使用してデプロイする場合は、`.github/workflows/deploy.yml`ファイルを作成し、以下の内容を記述します：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Add .nojekyll file
        run: touch out/.nojekyll

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: out
          branch: gh-pages
```

4. また、手動でデプロイする場合は以下のコマンドを実行します：

```bash
npm run deploy
# または
yarn deploy
```

5. リポジトリの Settings > Pages からデプロイの設定を行います

## Vercelへのデプロイ手順

このプロジェクトはVercelでホスティングされています。自分でデプロイする場合は以下の手順に従ってください：

1. Vercelアカウントを持っていることを確認します（GitHubアカウントでログイン可能）

2. Vercelダッシュボードで「New Project」をクリックします

3. Import GitリポジトリでGitHubから「riffluv/manaby-typing」を選択します

4. 環境変数は特に設定せずにデプロイできます

5. デプロイが完了したらVercelによって提供されたURLでアクセスできます

ライブデモ: [https://manaby-typing.vercel.app](https://manaby-typing.vercel.app)

## 参考リソース

- [Next.js ドキュメント](https://nextjs.org/docs)
- [BEM 命名規則の公式サイト](https://getbem.com/)
- [タイピングゲーム実装のヒント](https://developer.mozilla.org/ja/docs/Web/API/KeyboardEvent)
- [GitHub Pages デプロイガイド](https://docs.github.com/ja/pages/getting-started-with-github-pages)
- [Vercelデプロイガイド](https://vercel.com/docs/deployments/overview)
