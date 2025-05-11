// src/workers/effects-worker.js
// エフェクト（視覚・音声）処理のためのWeb Worker

import { logWorker } from './worker-log-utils.js';

// 状態管理
let effectsState = {
  effects: [],
  sounds: {},
  nextSound: null,
  isRunning: false,
  config: {
    soundEnabled: true,
    visualEffectsEnabled: true
  }
};

// フレームレート制御
let lastFrameTime = 0;
const frameInterval = 1000 / 20; // 20FPS
let animFrameId = null;

// エフェクト処理ループ
function effectsLoop(timestamp) {
  if (!effectsState.isRunning) return;

  // フレームレート制御
  if (timestamp - lastFrameTime < frameInterval) {
    animFrameId = setTimeout(() => {
      requestAnimationFrame(effectsLoop);
    }, frameInterval - elapsed);
    return;
  }

  lastFrameTime = timestamp;

  // エフェクト処理
  const now = Date.now();
  const activeEffects = [];

  // 期限切れのエフェクトを削除し、アクティブなエフェクトを収集
  effectsState.effects = effectsState.effects.filter(effect => {
    // エフェクトの寿命をチェック
    const isAlive = now - effect.timestamp < effect.duration;

    if (isAlive) {
      // エフェクトの状態を計算
      const progress = Math.min(1.0, (now - effect.timestamp) / effect.duration);

      activeEffects.push({
        ...effect,
        progress,
        active: true
      });
    }

    return isAlive;
  });

  // エフェクト状態をメインスレッドに送信
  self.postMessage({
    type: 'EFFECTS_UPDATE',
    effects: activeEffects,
    timestamp: now
  });

  // 音声再生キューを処理
  if (effectsState.nextSound) {
    self.postMessage({
      type: 'PLAY_SOUND',
      sound: effectsState.nextSound
    });

    effectsState.nextSound = null;
  }

  // ループ継続
  animFrameId = requestAnimationFrame(effectsLoop);
}

// エフェクト追加
function addEffect(effect) {
  // タイムスタンプがなければ現在時刻を設定
  if (!effect.timestamp) {
    effect.timestamp = Date.now();
  }

  // デフォルトの持続時間
  if (!effect.duration) {
    effect.duration = effect.type === 'key' ? 300 : 1000;
  }

  effectsState.effects.push(effect);

  // キーイベントに関連する音声
  if (effect.type === 'key') {
    const soundType = effect.isError ? 'error' : 'keypress';
    playSound(soundType);
  }

  // ワーカーが停止中の場合は起動
  if (!effectsState.isRunning) {
    startEffects();
  }
}

// 音声再生リクエスト
function playSound(soundType, options = {}) {
  if (!effectsState.config.soundEnabled) return;

  effectsState.nextSound = {
    type: soundType,
    ...options
  };
}

// エフェクト処理開始
function startEffects() {
  if (effectsState.isRunning) return;

  effectsState.isRunning = true;
  lastFrameTime = 0;

  animFrameId = requestAnimationFrame(effectsLoop);
  logWorker('Effects worker started');

  self.postMessage({ type: 'WORKER_STARTED' });
}

// エフェクト処理停止
function stopEffects() {
  effectsState.isRunning = false;

  if (animFrameId) {
    if (typeof animFrameId === 'number') {
      cancelAnimationFrame(animFrameId);
    } else {
      clearTimeout(animFrameId);
    }
    animFrameId = null;
  }

  logWorker('Effects worker stopped');
  self.postMessage({ type: 'WORKER_STOPPED' });
}

// メッセージハンドラー
self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case 'INIT':
      // 設定の初期化
      effectsState.config = {
        ...effectsState.config,
        ...data
      };
      logWorker('Effects worker initialized', data);
      break;

    case 'START':
      startEffects();
      break;

    case 'STOP':
      stopEffects();
      break;

    case 'ADD_EFFECT':
      addEffect(data);
      break;

    case 'PLAY_SOUND':
      playSound(data.type, data.options);
      break;

    case 'SET_CONFIG':
      effectsState.config = {
        ...effectsState.config,
        ...data
      };
      break;

    default:
      logWorker('Unknown message type', type);
  }
};

// 初期化完了メッセージ
self.postMessage({ type: 'WORKER_READY' });
logWorker('Effects worker initialized and ready');
