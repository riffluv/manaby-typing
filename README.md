# タイピングゲーム制作プロジェクト

このプロジェクトは Next.js を使用したタイピングゲームの開発リポジトリです。

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

## 参考リソース

- [Next.js ドキュメント](https://nextjs.org/docs)
- [BEM 命名規則の公式サイト](https://getbem.com/)
- [タイピングゲーム実装のヒント](https://developer.mozilla.org/ja/docs/Web/API/KeyboardEvent)
