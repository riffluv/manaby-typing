/**
 * animation-worker.js
 * アニメーション計算をバックグラウンドで処理するためのWebWorker
 * 2025年5月14日作成
 */

importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');

// アニメーション関連の状態変数
let isRunning = false;
let animationFrameId = null;
let lastFrameTime = 0;
let config = {
  fps: 60,
  keyframeInterval: 100, // 100msごとにキーフレーム生成
};

// アニメーションに関する状態
let animationState = {
  keyStates: {}, // キーの状態
  effects: [], // 視覚エフェクト
  animationProgress: [], // アニメーション進捗
  frameCount: 0,
  lastKeyframeTime: 0,
};

// アニメーション用のイベントキュー
const eventQueue = [];

/**
 * アニメーションフレームを計算
 * @param {number} timestamp 現在のタイムスタンプ
 */
function calculateAnimationFrame(timestamp) {
  if (!isRunning) return;

  // 最初のフレームの場合
  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
  }

  // フレーム間の経過時間を計算
  const deltaTime = timestamp - lastFrameTime;

  // FPSを制限（例：60FPS = 約16.7msごとに実行）
  const interval = 1000 / config.fps;
  if (deltaTime < interval) {
    animationFrameId = setTimeout(() => {
      calculateAnimationFrame(performance.now());
    }, 0);
    return;
  }

  // 次のフレームの計算
  const nextFrame = calculateNextFrame(deltaTime);

  // フレームカウントを増やす
  animationState.frameCount++;

  // キーフレームの時間を更新
  if (timestamp - animationState.lastKeyframeTime >= config.keyframeInterval) {
    // キーフレームイベントを発火
    eventQueue.push({
      name: 'ANIMATION_FRAME',
      data: {
        ...nextFrame,
        isKeyframe: true,
        frameCount: animationState.frameCount,
        timestamp,
      },
    });

    animationState.lastKeyframeTime = timestamp;
  }

  // 時間を更新
  lastFrameTime = timestamp;

  // 次のフレームをスケジュール
  animationFrameId = setTimeout(() => {
    calculateAnimationFrame(performance.now());
  }, 0);
}

/**
 * 次のアニメーションフレームを計算
 * @param {number} deltaTime フレーム間の時間差（ms）
 * @returns {Object} 新しいフレームの状態
 */
function calculateNextFrame(deltaTime) {
  // ここに実際のアニメーション計算処理を実装
  // 例：キー状態の更新、エフェクトの移動、アニメーションのステップ進行など

  // キー状態を更新（例：押されているキーのアニメーション）
  Object.keys(animationState.keyStates).forEach((key) => {
    const keyState = animationState.keyStates[key];

    // アクティブなキーのアニメーション進行
    if (keyState.active) {
      // 経過時間による進行（0→1の範囲で正規化）
      keyState.progress = Math.min(
        1,
        keyState.progress + deltaTime / keyState.duration
      );

      // アニメーション完了したらフラグを下げる
      if (keyState.progress >= 1) {
        keyState.active = false;
      }
    }
  });

  // エフェクトを更新
  animationState.effects = animationState.effects.filter((effect) => {
    // 経過時間による進行
    effect.progress = Math.min(
      1,
      effect.progress + deltaTime / effect.duration
    );

    // アニメーション完了していないエフェクトのみ残す
    return effect.progress < 1;
  });

  // 現在の状態を返す（シャローコピー）
  return {
    keyStates: { ...animationState.keyStates },
    effects: [...animationState.effects],
    animationProgress: [...animationState.animationProgress],
    deltaTime,
  };
}

/**
 * キーイベントを処理
 * @param {Object} data キーイベントデータ
 * @returns {Object} 処理結果
 */
function processKeyEvent(data) {
  const { key, type } = data;

  // 現在の状態を取得または初期化
  const keyState = animationState.keyStates[key] || {
    key,
    active: false,
    progress: 0,
    duration: 300, // デフォルトのアニメーション時間（ms）
    pressed: false,
  };

  // イベントタイプに応じて状態を更新
  switch (type) {
    case 'keydown':
      keyState.active = true;
      keyState.pressed = true;
      keyState.progress = 0; // リセット
      break;

    case 'keyup':
      keyState.pressed = false;
      // キーアップ時のアニメーションを別途設定することも可能
      break;
  }

  // 状態を保存
  animationState.keyStates[key] = keyState;

  return { success: true };
}

/**
 * エフェクトを追加
 * @param {Object} effectData エフェクトデータ
 * @returns {Object} 処理結果
 */
function addEffect(effectData) {
  const newEffect = {
    ...effectData,
    id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    progress: 0, // 0-1の間の進行度
    createdAt: Date.now(),
  };

  // エフェクトリストに追加
  animationState.effects.push(newEffect);

  // 最大数を超えたら古いものから削除
  const MAX_EFFECTS = 100;
  if (animationState.effects.length > MAX_EFFECTS) {
    animationState.effects = animationState.effects.slice(-MAX_EFFECTS);
  }

  return { success: true, effectId: newEffect.id };
}

/**
 * アニメーション設定を更新
 * @param {Object} newConfig 新しい設定
 * @returns {Object} 現在の設定
 */
function updateConfig(newConfig) {
  config = { ...config, ...newConfig };
  return { currentConfig: { ...config } };
}

/**
 * Workerのメイン処理：メッセージに応じて適切な処理を実行
 * @param {string} type メッセージのタイプ
 * @param {Object} data メッセージデータ
 * @returns {Object} 処理結果
 */
function processMessage(type, data) {
  // イベントキューをクリア
  eventQueue.length = 0;

  let response;

  try {
    switch (type) {
      case 'PING':
        response = { type: 'PONG', timestamp: Date.now() };
        break;

      case 'START_ANIMATION':
        if (!isRunning) {
          isRunning = true;
          lastFrameTime = 0;
          animationState.frameCount = 0;
          animationState.lastKeyframeTime = 0;
          calculateAnimationFrame(performance.now());
          response = { success: true };
        } else {
          response = {
            success: false,
            error: 'アニメーションはすでに実行中です',
          };
        }
        break;

      case 'STOP_ANIMATION':
        isRunning = false;
        if (animationFrameId !== null) {
          clearTimeout(animationFrameId);
          animationFrameId = null;
        }
        response = { success: true };
        break;

      case 'RESET_ANIMATION':
        animationState = {
          keyStates: {},
          effects: [],
          animationProgress: [],
          frameCount: 0,
          lastKeyframeTime: 0,
        };
        response = { success: true };
        break;

      case 'PROCESS_KEY_EVENT':
        response = processKeyEvent(data);
        break;

      case 'ADD_EFFECT':
        response = addEffect(data);
        break;

      case 'UPDATE_CONFIG':
        response = updateConfig(data.config);
        break;

      case 'GET_STATE':
        response = {
          currentState: {
            isRunning,
            frameCount: animationState.frameCount,
            keyStates: { ...animationState.keyStates },
            effectCount: animationState.effects.length,
          },
        };
        break;

      default:
        response = { error: `未知のメッセージタイプ: ${type}` };
    }

    // イベントキューがあればレスポンスに追加
    if (eventQueue.length > 0) {
      response.events = [...eventQueue];
    }

    return response;
  } catch (error) {
    console.error(`[AnimationWorker] エラー(${type}):`, error);
    return { error: error.message };
  }
}

// APIをエクスポート
const api = {
  processMessage,
};

// Comlinkを使用してAPIをエクスポート
self.Comlink.expose(api);
