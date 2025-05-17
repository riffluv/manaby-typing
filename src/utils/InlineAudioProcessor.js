'use client';

/**
 * InlineAudioProcessor.js
 * 最小レイテンシーで音声を処理するためのインライン音声処理ユーティリティ
 * 2025年5月18日作成
 */

// 音声バッファのキャッシュ
let audioBufferCache = new Map();
let audioContext = null;
let gainNode = null;

/**
 * 音声コンテキストの初期化 (遅延初期化)
 * @returns {AudioContext} 作成されたオーディオコンテキスト
 */
export function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!audioContext) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.7; // デフォルトの音量
    } catch (e) {
      console.error('AudioContext初期化エラー:', e);
      return null;
    }
  }

  return audioContext;
}

/**
 * 超低遅延モードで効果音を再生
 * 音声処理をメインスレッドで行い、最小限の処理ステップで実行
 * @param {string} type 'success' または 'error'
 * @returns {boolean} 再生が開始されたかどうか
 */
export function playInstantSound(type = 'success') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    // レイテンシーを最小化するためにサスペンド状態でも再生を試みる
    // AudioContextが停止している場合、非同期で再開を試みる
    if (ctx.state === 'suspended') {
      // 再開を試みるが、結果を待たずに処理継続
      ctx.resume().catch(() => {});
    }

    // キャッシュから音声バッファを取得
    let buffer = audioBufferCache.get(type);
    if (!buffer) {
      // キャッシュがない場合はデフォルトの種類に基づいて合成
      buffer = createSyntheticAudioBuffer(ctx, type);
      audioBufferCache.set(type, buffer);
    }

    // 最小ステップでソースノードを作成して即時再生
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode || ctx.destination);
    source.start(0);

    return true;
  } catch (e) {
    console.warn('インライン音声再生エラー:', e);
    return false;
  }
}

/**
 * 合成オーディオバッファを作成
 * @param {AudioContext} ctx オーディオコンテキスト
 * @param {string} type 音のタイプ
 * @returns {AudioBuffer} 合成されたオーディオバッファ
 */
function createSyntheticAudioBuffer(ctx, type) {
  // 非常に短い音を合成（0.1秒）
  const sampleRate = ctx.sampleRate;
  const duration = 0.1;
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const channelData = buffer.getChannelData(0);

  // タイプに応じた音を合成
  if (type === 'success') {
    // 正解音：高めの短い音（ピッ）
    const frequency = 1200; // 周波数（Hz）
    for (let i = 0; i < channelData.length; i++) {
      // サイン波で合成
      const t = i / sampleRate;
      channelData[i] =
        Math.sin(2 * Math.PI * frequency * t) * Math.exp(-20 * t); // 減衰
    }
  } else {
    // 不正解音：低めの短い音（ブッ）
    const frequency = 300; // 周波数（Hz）
    for (let i = 0; i < channelData.length; i++) {
      // のこぎり波で合成
      const t = i / sampleRate;
      channelData[i] = (((frequency * t) % 1) * 2 - 1) * Math.exp(-15 * t); // 減衰
    }
  }

  return buffer;
}

/**
 * オーディオコンテキストの状態を確認
 * @returns {string} オーディオコンテキストの状態
 */
export function getAudioContextState() {
  return audioContext ? audioContext.state : 'not_initialized';
}

/**
 * オーディオバッファをキャッシュに追加
 * @param {string} key バッファのキー
 * @param {AudioBuffer} buffer キャッシュするバッファ
 */
export function addAudioBufferToCache(key, buffer) {
  audioBufferCache.set(key, buffer);
}

export default {
  playInstantSound,
  getAudioContext,
  getAudioContextState,
  addAudioBufferToCache,
};
