'use client';

/**
 * AudioInitializer.js
 * 音声システムの事前初期化とキャッシングを行うユーティリティ
 * タイピングゲームの初動レスポンス速度を向上
 */

import soundSystem from './SoundUtils';

/**
 * 音声システムを初期化し、主要な効果音をプリロード
 * ページの読み込み時に実行して音声レスポンスを向上させる
 */
export function initAudioSystem() {
  if (typeof window === 'undefined') {
    return; // サーバーサイドでは実行しない
  }

  // AudioContextの初期状態を確認
  const audioCtx = soundSystem.getAudioContext();
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
 * キーボード入力時の直接呼び出し用
 * @param {string} type - 効果音のタイプ ('success'|'error')
 */
export function playInstantTypingSound(type = 'success') {
  // SoundUtilsのfastPlayBuffer機能を直接利用
  if (soundSystem && soundSystem.sfxEnabled) {
    // バッファに事前ロード済みの効果音を使用
    if (soundSystem.sfxBuffers && soundSystem.sfxBuffers[type.toLowerCase()]) {
      soundSystem._fastPlayBuffer(soundSystem.sfxBuffers[type.toLowerCase()]);
    } else {
      // フォールバック：通常の再生方法
      soundSystem.playSound(type);
    }
  }
}

export default {
  initAudioSystem,
  playInstantTypingSound,
};
