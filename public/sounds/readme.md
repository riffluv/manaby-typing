# レトロSFキーボード効果音

このディレクトリには、レトロSFキーボードの効果音を格納しています。

## 効果音の生成

効果音は2種類の方法で生成されています：

1. **Web Audio API** - リアルタイムで生成される合成音
   - `KeyboardSoundUtils.js` に実装されています
   - レスポンスが早く、外部ファイルに依存しません

2. **ダウンロード可能な効果音ファイル** - WAVファイル形式
   - オフライン使用やプリロード用
   - `synth-keyboard-click.js` を実行して生成できます

## 効果音の使い方

### 効果音のダウンロード

以下のいずれかの方法でダウンロードします：

1. ブラウザで `/sounds/synth-keyboard-click.js` にアクセスして「効果音を生成してダウンロード」ボタンをクリック

2. または、以下のファイルを手動で生成後に `/public/sounds/` に配置：
   - `synth-keyboard-click.wav` - 通常のキー押下音
   - `synth-keyboard-error.wav` - 誤入力時の音
   - `synth-keyboard-success.wav` - 正解時の音

### 効果音の有効・無効切り替え

ユーザーはSoundToggleコンポーネントを通じて効果音のON/OFFを切り替えることができます。
設定はlocalStorageの `retroKeyboardSounds` キーに保存されます。

```javascript
// 効果音の設定を取得
const soundsEnabled = localStorage.getItem('retroKeyboardSounds') !== 'false';

// 効果音の設定を変更
localStorage.setItem('retroKeyboardSounds', 'true'); // ONにする
localStorage.setItem('retroKeyboardSounds', 'false'); // OFFにする
```

## カスタマイズ

`KeyboardSoundUtils.js` の VOLUME_SETTINGS オブジェクトを編集することで音量調整が可能です。

```javascript
// 音量設定 (0.0 - 1.0)
const VOLUME_SETTINGS = {
  click: 0.3, // キー押下音の音量
  error: 0.2, // エラー音の音量
  success: 0.3, // 成功音の音量
};
```
