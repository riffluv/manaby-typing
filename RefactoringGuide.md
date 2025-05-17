# Canvas タイピングエンジン リファクタリングガイド

このドキュメントでは、`canvas-typing-engine.js` のリファクタリング方針と実装手順について説明します。このガイドは、コードの保守、拡張、または今後の最適化の際に参考にしてください。

## リファクタリング方針

### 1. クリーンコードの原則

- **単一責任の原則** - 各メソッドは一つの機能だけを担当
- **DRY (Don't Repeat Yourself)** - 重複コードの排除
- **明確な命名規則** - 意図が明確に伝わる変数名・メソッド名
- **適切なコメント** - 「なぜ」そのコードが必要かを説明

### 2. パフォーマンス最適化

- **レンダリングループの効率化** - 必要なときだけ描画
- **コンテキスト状態の最小限の変更** - 不必要な状態変更を避ける
- **オフスクリーンキャンバスの活用** - 複雑な描画の事前レンダリング

### 3. レスポンシブデザイン

- **親要素へのフィット** - コンテナサイズに合わせた自動調整
- **リサイズイベントの適切な処理** - 頻繁なリサイズでのパフォーマンス維持
- **デバイスピクセル比の考慮** - 高 DPI 環境での鮮明な表示

## 実装ステップ

### ステップ 1: コードの整理と不要部分の削除

1. 未使用変数・メソッドの削除
2. 冗長なコード・コメントのクリーンアップ
3. メソッドの整理と名前付けの改善

### ステップ 2: リソース管理の改善

1. `destroy()` メソッドの実装
2. イベントリスナーの適切な解除
3. オブジェクト参照のクリア

### ステップ 3: レスポンシブ対応

1. `ResizeObserver` の実装
2. コンテナサイズ追従機能の追加
3. リサイズリスナーシステムの構築

### ステップ 4: 描画最適化

1. コンテキスト設定の一元化
2. フレームごとのコンテキストリセット実装
3. 描画メソッドの最適化

## コード設計パターン

### 状態管理

```javascript
// 描画が必要な場合のみレンダリング
updateGameState(newState) {
  // 変更前の状態を保存（差分検出用）
  const prevState = this.gameState ? { ...this.gameState } : {};

  // 新しい状態をマージ
  this.gameState = { ...this.gameState, ...newState };

  // 重要な状態変化があったかチェック（差分検出）
  const hasImportantChange =
    prevState.romaji !== this.gameState.romaji ||
    prevState.typedLength !== this.gameState.typedLength ||
    prevState.isError !== this.gameState.isError ||
    prevState.currentInput !== this.gameState.currentInput;

  // 表示に関わる状態変更があった場合、描画フラグをセット
  if (hasImportantChange) {
    this._needsRender = true;
  }
}
```

### 描画コンテキスト管理

```javascript
// コンテキスト設定の一元化
_setupContextDefaults(ctx) {
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.imageSmoothingEnabled = false;
  ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
  // その他の設定...
}
```

### イベント処理

```javascript
// リサイズイベントリスナー登録
onResize(listener) {
  if (typeof listener === 'function') {
    this.resizeListeners.push(listener);
  }
  return this;
}
```

## テスト方法

1. **様々な DPI 設定でのテスト**

   - Windows (100%, 125%, 150% スケーリング)
   - macOS (標準、Retina ディスプレイ)
   - Linux (様々なディストリビューション)

2. **レスポンシブ動作確認**

   - ブラウザウィンドウサイズ変更
   - 親コンテナサイズ変更

3. **パフォーマンステスト**
   - 高リフレッシュレートモニター (120Hz+)
   - タイピング中のフレームレート測定

## 今後の拡張性

- **WebGL/WebGPU 対応** - より高度なグラフィック表現
- **アクセシビリティ対応** - 色覚多様性への配慮
- **アニメーション機能強化** - より滑らかな視覚効果
- **タッチデバイス最適化** - モバイル環境での使いやすさ向上

---

このガイドは継続的に更新され、コードベースの進化に合わせて拡張されます。
最終更新：2025 年 5 月 17 日
