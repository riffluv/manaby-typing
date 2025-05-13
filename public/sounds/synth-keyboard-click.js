/**
 * synth-keyboard-click.js
 * 合成キーボード効果音をダウンロードできるようにするスクリプト
 */

// オーディオコンテキストの作成
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// WAVファイルとしてエクスポートするための関数
function exportToWav(buffer, filename) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  // WAVファイルのヘッダー情報を含むArrayBuffer作成
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  // "RIFF" チャンク記述子
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length * numChannels * 2, true);
  writeString(view, 8, 'WAVE');

  // "fmt " サブチャンク
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt チャンクサイズ
  view.setUint16(20, 1, true); // フォーマットタイプ (PCM)
  view.setUint16(22, numChannels, true); // チャンネル数
  view.setUint32(24, sampleRate, true); // サンプルレート
  view.setUint32(28, sampleRate * numChannels * 2, true); // バイト/秒
  view.setUint16(32, numChannels * 2, true); // ブロックアライン
  view.setUint16(34, 16, true); // ビット/サンプル

  // "data" サブチャンク
  writeString(view, 36, 'data');
  view.setUint32(40, length * numChannels * 2, true);

  // オーディオデータ結合
  const audioData = new Float32Array(length * numChannels);

  // 各チャンネルのデータをインターリーブ
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      audioData[i * numChannels + channel] = channelData[i];
    }
  }

  // 16ビットPCMに変換
  const pcmData = new Int16Array(length * numChannels);
  for (let i = 0; i < audioData.length; i++) {
    pcmData[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
  }

  // WAVファイル結合
  const wavBlob = new Blob([wavHeader, pcmData.buffer], { type: 'audio/wav' });

  // ダウンロードリンク作成
  const link = document.createElement('a');
  link.href = URL.createObjectURL(wavBlob);
  link.download = filename;
  link.click();
}

// WAVヘッダーに文字列書き込み
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// 効果音生成関数
function createSounds() {
  generateClickSound();
  generateErrorSound();
  generateSuccessSound();
}

// クリック音生成
function generateClickSound() {
  const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 0.2, audioContext.sampleRate);
  const channelL = buffer.getChannelData(0);
  const channelR = buffer.getChannelData(1);

  // サイン波でクリック音を生成
  for (let i = 0; i < buffer.length; i++) {
    const time = i / audioContext.sampleRate;
    const frequency = 800 * Math.exp(-time * 10); // 減衰周波数
    const amplitude = 0.4 * Math.exp(-time * 10); // 減衰振幅

    const value = amplitude * Math.sin(2 * Math.PI * frequency * time);
    channelL[i] = value;
    channelR[i] = value;
  }

  exportToWav(buffer, 'synth-keyboard-click.wav');
}

// エラー音生成
function generateErrorSound() {
  const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 0.3, audioContext.sampleRate);
  const channelL = buffer.getChannelData(0);
  const channelR = buffer.getChannelData(1);

  // ノコギリ波でエラー音を生成
  for (let i = 0; i < buffer.length; i++) {
    const time = i / audioContext.sampleRate;
    const frequency = 150 * Math.exp(-time * 5); // 減衰周波数
    const amplitude = 0.4 * Math.exp(-time * 5); // 減衰振幅

    // ノコギリ波生成
    const value = amplitude * ((time * frequency * 2) % 2 - 1);
    channelL[i] = value;
    channelR[i] = value;
  }

  exportToWav(buffer, 'synth-keyboard-error.wav');
}

// 成功音生成
function generateSuccessSound() {
  const buffer = audioContext.createBuffer(2, audioContext.sampleRate * 0.3, audioContext.sampleRate);
  const channelL = buffer.getChannelData(0);
  const channelR = buffer.getChannelData(1);

  // サイン波で上昇音を生成
  for (let i = 0; i < buffer.length; i++) {
    const time = i / audioContext.sampleRate;
    const frequency = 400 + 400 * (1 - Math.exp(-time * 10)); // 上昇周波数
    const amplitude = 0.4 * Math.exp(-time * 5); // 減衰振幅

    const value = amplitude * Math.sin(2 * Math.PI * frequency * time);
    channelL[i] = value;
    channelR[i] = value;
  }

  exportToWav(buffer, 'synth-keyboard-success.wav');
}

// UIの作成
document.body.innerHTML = `
  <div style="padding: 20px; font-family: Arial; max-width: 600px; margin: 0 auto;">
    <h1>合成キーボード効果音</h1>
    <p>このページでは合成で作成されたキーボード効果音をダウンロードできます。</p>
    <button id="generateButton" style="padding: 10px 20px; margin: 20px 0; background: #FF8800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">効果音を生成してダウンロード</button>
    <div id="info" style="margin-top: 20px;"></div>
    
    <h2>使用方法</h2>
    <p>1. 「効果音を生成してダウンロード」ボタンをクリックします。</p>
    <p>2. 3つの効果音ファイルがダウンロードされます:</p>
    <ul>
      <li><code>synth-keyboard-click.wav</code> - 通常のキータイプ音</li>
      <li><code>synth-keyboard-error.wav</code> - エラー時の音</li>
      <li><code>synth-keyboard-success.wav</code> - 成功時の音</li>
    </ul>
    <p>3. ダウンロードしたファイルをプロジェクトの <code>public/sounds/</code> ディレクトリに配置します。</p>
    <p>4. <code>KeyboardSoundUtils.js</code> ファイルを更新して、これらのファイルを使用するようにします。</p>
    
    <h3>サンプルコード</h3>
    <pre style="background: #f5f5f5; padding: 15px; overflow-x: auto;">
// ファイルからサウンドをロードする例
static async loadSounds() {
  // GitHub Pagesデプロイに対応するためのパス設定
  const basePath = document.currentScript && 
    document.currentScript.getAttribute('data-base-path') || '';
  
  const clickSound = await fetch(`${basePath}/sounds/synth-keyboard-click.wav`)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
  
  soundCache.click = clickSound;
  
  // 同様にエラーと成功音もロード
}

// 再生する例
static playClickSound() {
  if (soundCache.click) {
    const source = audioContext.createBufferSource();
    source.buffer = soundCache.click;
    source.connect(audioContext.destination);
    source.start();
  } else {
    // フォールバックとしてシンセサイズド効果音を使用
  }
}
</pre>
  </div>
`;

// イベントリスナー
document.getElementById('generateButton').addEventListener('click', () => {
  createSounds();
  document.getElementById('info').textContent = '効果音を生成しています...ダウンロードが自動的に開始されます。';
});
