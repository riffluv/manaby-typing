'use client';

/**
 * AudioInitializer.js
 * 音声システムの事前初期化とキャッシングを行うユーティリティ
 * タイピングゲームの初動レスポンス速度を向上
 * 2025年5月18日更新 - 超低レイテンシー対応
 */

import soundSystem from './SoundUtils';
import inlineAudio from './InlineAudioProcessor';

// AudioWorklet関連の状態管理
let audioWorkletReady = false;
let audioWorkletProcessor = null;

/**
 * 音声システムを初期化し、主要な効果音をプリロード
 * ページの読み込み時に実行して音声レスポンスを向上させる
 */
export function initAudioSystem() {
  if (typeof window === 'undefined') {
    return; // サーバーサイドでは実行しない
  }

  // 複数の音声処理システムを初期化
  // 1. インライン音声プロセッサを初期化（合成音声用）
  inlineAudio.getAudioContext();

  // 2. 標準サウンドシステムを初期化（サンプルベース音声用）
  const audioCtx = soundSystem.getAudioContext();

  // 3. [高度] AudioWorklet APIを初期化試行（ブラウザサポートがあれば）
  initAudioWorklet().catch((err) => {
    console.log(
      '[AudioInitializer] AudioWorklet APIの初期化をスキップしました:',
      err.message
    );
  });
  // グローバルに利用できるように設定（複数の音声エンジンにアクセス可能に）
  window.AudioInitializer = {
    // 標準API
    playInstantTypingSound,
    initAudioSystem,

    // 拡張API
    inlineAudio: {
      playSound: inlineAudio.playInstantSound,
      getState: inlineAudio.getAudioContextState,
    },
    soundSystem: {
      play: soundSystem.playSound,
      ultraFastPlay: soundSystem.ultraFastPlayTypingSound,
    },
    // AudioWorklet API
    audioWorklet: {
      playSound: playSoundWithWorklet,
      isReady: () => audioWorkletReady,
    },
  };
  console.log(
    '[AudioInitializer] AudioContextの初期状態:',
    audioCtx ? audioCtx.state : 'unavailable'
  );

  // ユーザーインタラクションリスナーを設定（AudioContextのアクティベーション用）
  const activateAudio = async () => {
    try {
      // AudioContextを再開
      if (audioCtx && audioCtx.state === 'suspended') {
        await audioCtx.resume();
        console.log(
          '[AudioInitializer] AudioContextを再開しました:',
          audioCtx.state
        );
      }

      // 重要な効果音（タイピング音）を事前にロード
      await soundSystem.initializeAllSounds();
      console.log('[AudioInitializer] 重要な効果音をプリロードしました');

      // AudioWorkletが初期化されていない場合は再試行
      if (
        !audioWorkletReady &&
        window.AudioContext &&
        'audioWorklet' in AudioContext.prototype
      ) {
        initAudioWorklet().catch((err) =>
          console.warn('[AudioInitializer] AudioWorklet初期化再試行失敗:', err)
        );
      }

      // 無音バッファを再生してAudioContextをウォームアップ
      const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioCtx.destination);
      source.start(0);

      // リスナーを削除（1回のみの実行）
      document.removeEventListener('click', activateAudio);
      document.removeEventListener('keydown', activateAudio);
      document.removeEventListener('touchstart', activateAudio);
    } catch (err) {
      console.error('[AudioInitializer] 音声システムの初期化エラー:', err);
    }
  };

  // イベントリスナーを登録
  document.addEventListener('click', activateAudio, { once: true });
  document.addEventListener('keydown', activateAudio, { once: true });
  document.addEventListener('touchstart', activateAudio, { once: true });

  console.log('[AudioInitializer] 音声システムの初期化準備完了');
  return true;
}

/**
 * 超低遅延モードでタイピング効果音を再生
 * キーボード入力時の直接呼び出し用、処理経路を最短化
 * @param {string} type - 効果音のタイプ ('success'|'error')
 */
export function playInstantTypingSound(type = 'success') {
  // 0. 最速：AudioWorklet APIを試行（最高性能、専用スレッド）
  try {
    if (audioWorkletReady && audioWorkletProcessor) {
      const result = playSoundWithWorklet(type);
      if (result) return true; // AudioWorkletで再生に成功したら即時リターン
    }
  } catch (e) {
    // エラーを抑制（次の方法を試行）
  }

  // 1. 次点：インライン処理（最速・合成音声）を試行
  try {
    if (inlineAudio && inlineAudio.playInstantSound) {
      const result = inlineAudio.playInstantSound(type);
      if (result) return true; // 成功したら即座にリターン
    }
  } catch (e) {
    // エラーを抑制（次の方法を試行）
  }

  // 2. 3番目：SoundUtilsのバッファを直接使用
  try {
    if (typeof window === 'undefined') return false;

    // AudioContextが停止している場合でも処理を続行
    const ctx = soundSystem.context;
    const buffer =
      soundSystem.sfxBuffers && soundSystem.sfxBuffers[type.toLowerCase()];

    // バッファとコンテキストが存在する場合のみ処理
    if (ctx && buffer) {
      // 可能な限り最小限のコードで音を鳴らす
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(soundSystem.gainNode || ctx.destination);
      src.start(0);
      return true;
    }
  } catch (e) {
    // エラーを抑制（最終方法を試行）
  }

  // 3. 最終手段：SoundUtilsの標準メソッドを使用（フォールバック）
  try {
    if (soundSystem && soundSystem.sfxEnabled) {
      soundSystem.playSound(type);
      return true;
    }
  } catch (e) {
    console.warn('全ての音声再生方法が失敗:', e);
  }

  return false;
}

/**
 * [高度] AudioWorkletを初期化
 * サポートされている場合、AudioWorkletを使用して音声処理を行う
 */
async function initAudioWorklet() {
  if (!window.AudioWorklet) {
    throw new Error('AudioWorklet is not supported in this browser');
  }

  const audioCtx = soundSystem.getAudioContext();
  if (!audioCtx || audioCtx.state === 'suspended') {
    throw new Error('AudioContext is not available or suspended');
  }
  // AudioWorkletの登録
  await audioCtx.audioWorklet.addModule('/audio-processors/sound-processor.js');
  audioWorkletProcessor = new AudioWorkletNode(
    audioCtx,
    'ultra-low-latency-sound-processor'
  );

  // 接続と初期化
  audioWorkletProcessor.connect(audioCtx.destination);
  audioWorkletReady = true;
  console.log('[AudioInitializer] AudioWorkletの初期化に成功');
}

/**
 * AudioWorkletを使用して音声を再生
 * @param {string} type - サウンドタイプ ('success'|'error')
 * @param {Float32Array} [samples] - 任意で指定する音声サンプル
 */
export function playSoundWithWorklet(type = 'success', samples = null) {
  if (!audioWorkletReady) {
    console.warn('[AudioWorklet] 初期化されていません');
    return false;
  }

  try {
    // サンプルが指定されていない場合は、タイプに応じたサンプルを生成
    if (!samples) {
      const audioCtx = soundSystem.getAudioContext();
      if (!audioCtx) return false;

      const sampleRate = audioCtx.sampleRate;
      const duration = 0.1; // 100ms
      const bufferSize = Math.floor(sampleRate * duration);
      samples = new Float32Array(bufferSize);

      if (type === 'success') {
        // 正解音のサンプル生成（高めの短い音）
        const frequency = 1200;
        for (let i = 0; i < bufferSize; i++) {
          const t = i / sampleRate;
          samples[i] =
            Math.sin(2 * Math.PI * frequency * t) * Math.exp(-20 * t); // 減衰
        }
      } else {
        // 不正解音のサンプル生成（低めの短い音）
        const frequency = 300;
        for (let i = 0; i < bufferSize; i++) {
          const t = i / sampleRate;
          samples[i] = (((frequency * t) % 1) * 2 - 1) * Math.exp(-15 * t); // 減衰
        }
      }
    }

    // AudioWorkletノードにサンプルとタイプを送信
    audioWorkletProcessor.port.postMessage({
      type: 'play',
      data: {
        id: `typing-${type}`,
        buffer: [{ samples }],
        options: {
          volume: 0.8,
        },
      },
    });
    return true;
  } catch (e) {
    console.error('[AudioWorklet] 再生エラー:', e);
  }

  return false;
}

export default {
  initAudioSystem,
  playInstantTypingSound,
  playSoundWithWorklet,
};
