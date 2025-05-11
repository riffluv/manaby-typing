// animation-worker.js
// アニメーションとエフェクト処理のためのWeb Worker

import { logWorker } from './worker-log-utils.js';

// 初期状態を設定
let animationState = {
  nextKey: '',
  lastPressedKey: '',
  isError: false,
  effects: [],
  animations: [],
  frameRate: 30,
  isRunning: false
};

// アニメーションフレーム制御
let lastFrameTime = 0;
const frameInterval = 1000 / 30; // 30FPSを目標
let animationFrameId = null;

// キー押下エフェクト用の状態追跡オブジェクト
const keyStates = {};

// アニメーションループ
function animationLoop(timestamp) {
  if (!animationState.isRunning) return;

  // フレームレート制御
  const elapsed = timestamp - lastFrameTime;
  if (elapsed < frameInterval) {
    animationFrameId = setTimeout(() => {
      requestAnimationFrame(animationLoop);
    }, frameInterval - elapsed);
    return;
  }

  lastFrameTime = timestamp;

  // 更新されたアニメーション状態をメインスレッドに送信
  const updateData = {
    type: 'ANIMATION_FRAME',
    timestamp: timestamp,
    keyStates: processKeyStates(),
    effects: animationState.effects.filter(effect => effect.active),
    animationProgress: calculateAnimationProgress(timestamp)
  };

  self.postMessage(updateData);

  // 次のフレームをリクエスト
  animationFrameId = requestAnimationFrame(animationLoop);
}

// キーの状態を更新・処理する関数
function processKeyStates() {
  const now = Date.now();
  const result = {};

  // キーの状態を更新（古いものを削除）
  Object.keys(keyStates).forEach(key => {
    const state = keyStates[key];
    // 300ms経過したキーの状態をクリアする
    if (now - state.timestamp > 300) {
      delete keyStates[key];
    } else {
      result[key] = {
        ...state,
        // エフェクト計算を行う（進行度など）
        progress: Math.min(1.0, (now - state.timestamp) / 300)
      };
    }
  });

  return result;
}

// 現在進行中のアニメーション進行度を計算
function calculateAnimationProgress(timestamp) {
  return animationState.animations.map(anim => {
    const elapsed = timestamp - anim.startTime;
    const progress = Math.min(1.0, elapsed / anim.duration);

    return {
      id: anim.id,
      type: anim.type,
      progress: progress,
      completed: progress >= 1.0
    };
  });
}

// キー押下イベントの処理
function handleKeyPress(key, isError) {
  const timestamp = Date.now();

  // キー状態を更新
  keyStates[key.toLowerCase()] = {
    pressed: true,
    timestamp: timestamp,
    error: isError
  };

  // エフェクト追加
  animationState.effects.push({
    id: `key-${key}-${timestamp}`,
    type: isError ? 'error' : 'correct',
    key: key,
    timestamp: timestamp,
    active: true
  });

  // メイン処理をトリガー
  if (!animationState.isRunning) {
    startAnimation();
  }
}

// アニメーション開始
function startAnimation() {
  if (!animationState.isRunning) {
    animationState.isRunning = true;
    lastFrameTime = 0;
    animationFrameId = requestAnimationFrame(animationLoop);

    logWorker('Animation worker started');
    self.postMessage({ type: 'WORKER_STARTED', timestamp: Date.now() });
  }
}

// アニメーション停止
function stopAnimation() {
  animationState.isRunning = false;

  if (animationFrameId) {
    if (typeof animationFrameId === 'number') {
      cancelAnimationFrame(animationFrameId);
    } else {
      clearTimeout(animationFrameId);
    }
    animationFrameId = null;
  }

  logWorker('Animation worker stopped');
  self.postMessage({ type: 'WORKER_STOPPED', timestamp: Date.now() });
}

// メッセージハンドラー
self.onmessage = function (e) {
  const { type, data } = e.data;

  switch (type) {
    case 'INIT':
      animationState = { ...animationState, ...data };
      logWorker('Animation worker initialized', data);
      break;

    case 'START':
      startAnimation();
      break;

    case 'STOP':
      stopAnimation();
      break;

    case 'KEY_PRESS':
      handleKeyPress(data.key, data.isError);
      break;

    case 'SET_NEXT_KEY':
      animationState.nextKey = data.key;
      break;

    case 'ADD_EFFECT':
      animationState.effects.push({
        ...data,
        timestamp: Date.now(),
        active: true
      });
      break;

    case 'ADD_ANIMATION':
      animationState.animations.push({
        ...data,
        startTime: Date.now()
      });
      break;

    case 'SET_FRAME_RATE':
      animationState.frameRate = data.frameRate;
      // フレームレートの変更を反映
      frameInterval = 1000 / animationState.frameRate;
      break;

    default:
      logWorker('Unknown message type', type, data);
  }
};

// 初期化完了メッセージを送信
self.postMessage({ type: 'WORKER_READY' });
logWorker('Animation worker initialized and ready');
