# フォント定義の整理と改善

## 現状の分析

現在のタイピングゲームプロジェクトでは、フォント定義が以下のように整理されています：

### DesignTokens.js

`DesignTokens.js`が主要なソースとして機能し、Typography オブジェクト内に以下のようにフォントサイズが定義されています：

```javascript
// ゲーム固有のフォントサイズ - お題とタイピング用に適切なサイズを設定
problemText: '2rem',     // お題用フォントサイズ - より大きく読みやすく
typingText: '1.5rem',    // ローマ字入力用フォントサイズ - 適切なサイズに調整
```

### globals.css

`globals.css`には対応する CSS 変数として以下のように定義されています：

```css
/* ゲーム固有のフォントサイズ - DesignTokens.jsのTypography.fontSize参照 */
--font-size-problem-text: 2rem; /* お題テキスト - Typography.fontSize.problemText */
--font-size-typing-text: 1.5rem; /* ローマ字テキスト - Typography.fontSize.typingText */
```

### TextStyleUtils.js

`TextStyleUtils.js`では、`DesignTokens.js`からインポートした`Typography`を使用して、以下のようにスタイルが定義されています：

```javascript
// お題テキスト用スタイル
export const problemTextStyle = {
  fontFamily: Typography.fontFamily.normal,
  fontSize: Typography.fontSize.problemText, // DesignTokens.jsから参照
  lineHeight: Typography.lineHeight.problemText,
  color: 'var(--problem-text-color)',
  // ...その他のスタイル...
};

// ローマ字用スタイル
export const romajiFontStyle = {
  fontFamily: Typography.fontFamily.normal,
  fontSize: Typography.fontSize.typingText, // DesignTokens.jsから参照
  lineHeight: Typography.lineHeight.typingText,
  // ...その他のスタイル...
};
```

## 評価と推奨事項

### 現状の良い点

- **単一ソースの原則**: `DesignTokens.js`がフォント定義の主要なソースとして機能しています
- **命名の一貫性**: CSS 変数名と JavaScript の変数名が整合性を保っています
- **明確なコメント**: コメントにより関連性が明記されています
- **適切なサイズ設定**: お題テキスト(2rem)とローマ字テキスト(1.5rem)のサイズが適切に設定されています

### 継続して維持すべき点

1. **単一ソースの原則**: 今後も`DesignTokens.js`をフォントサイズの唯一のソースとして使用する
2. **ドキュメント化**: コメントを通じて各変数の用途と関連性を引き続き明確にする
3. **一貫性の維持**: 新しいフォントスタイルを追加する際も同様のパターンを維持する

## 結論

フォント定義は既に十分に整理されており、大きな変更は必要ありません。現在の実装は明確で一貫性があり、お題テキストとローマ字テキストのフォントサイズは適切に設定されています。プロジェクトのこの部分は現状のままで問題ありません。

将来的な拡張や変更が必要になった場合も、現在の構造を維持することで一貫性を保ち、管理を容易にすることができます。
