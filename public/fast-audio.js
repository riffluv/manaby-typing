// 音声処理高速化イベントリスナー
// キーダウンイベントを直接捕捉してAudioContextをバイパスした超低レイテンシー処理を実現

// AudioContextの最適化バージョンを直接実装
(function () {
  // ブラウザ環境のみで実行
  if (typeof window === 'undefined') return;

  // 音声バッファをメモリに保持
  let successBuffer = null;
  let errorBuffer = null;
  let audioContext = null;
  let gainNode = null;

  // 音声コンテキストと基本バッファを初期化
  function initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;

      audioContext = new AudioContext();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.6; // デフォルト音量

      // 基本的なサウンドを合成
      successBuffer = createSuccessSound();
      errorBuffer = createErrorSound();

      return true;
    } catch (e) {
      console.warn('オーディオ初期化エラー:', e);
      return false;
    }
  }

  // 成功音を合成
  function createSuccessSound() {
    if (!audioContext) return null;

    const duration = 0.08; // 80ms
    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);

    // 周波数変調した短いビープ音
    const baseFreq = 1200;
    for (let i = 0; i < data.length; i++) {
      const t = i / audioContext.sampleRate;
      // 時間経過で減衰するサイン波
      data[i] =
        Math.sin(2 * Math.PI * (baseFreq + 300 * t) * t) * Math.exp(-25 * t);
    }

    return buffer;
  }

  // エラー音を合成
  function createErrorSound() {
    if (!audioContext) return null;

    const duration = 0.1; // 100ms
    const buffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );
    const data = buffer.getChannelData(0);

    // 低周波のノイズ
    const baseFreq = 250;
    for (let i = 0; i < data.length; i++) {
      const t = i / audioContext.sampleRate;
      // 不快に聞こえるようにわずかに非調和的な周波数を使用
      data[i] =
        (Math.sin(2 * Math.PI * baseFreq * t) * 0.7 +
          Math.sin(2 * Math.PI * (baseFreq * 1.1) * t) * 0.3) *
        Math.exp(-15 * t);
    }

    return buffer;
  }

  // 最速の音声再生
  function playSound(type) {
    if (!audioContext) return false;

    try {
      // 状態をチェックせず即再生を試みる
      const buffer = type === 'success' ? successBuffer : errorBuffer;
      if (!buffer) return false;

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start(0);
      return true;
    } catch (e) {
      return false;
    }
  }

  // キーイベントリスナーを設定
  function setupKeyHandler() {
    document.addEventListener('keydown', function (event) {
      // Ctrlキーなどの修飾キーが押されている場合は無視
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      // 特殊キーの場合も無視
      if (
        event.key === 'Tab' ||
        event.key === 'Escape' ||
        event.key === 'CapsLock' ||
        event.key === 'Shift' ||
        event.key === 'Control' ||
        event.key === 'Alt'
      ) {
        return;
      }

      // タイピング中の場合のみ効果音を鳴らす
      // ゲームの状態を直接判定するのは困難なので、body要素のクラスなどで判断する方法も
      if (document.body.classList.contains('typing-active')) {
        playSound('success');
      }
    });
  }

  // DOMロード完了時に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAudio();
      // setupKeyHandler(); // 標準のキーハンドラを使用する場合はコメントを外す
    });
  } else {
    initAudio();
    // setupKeyHandler(); // 標準のキーハンドラを使用する場合はコメントを外す
  }

  // グローバルAPIを公開
  window.__typingAudioFast = {
    init: initAudio,
    play: playSound,
    getContext: function () {
      return audioContext;
    },
  };
})();
