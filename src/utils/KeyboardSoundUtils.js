'use client';

/**
 * KeyboardSoundUtils.js
 * キーボード効果音を管理するユーティリティ
 * レスポンス速度を最優先するため、ごく軽量な実装
 * 
 * 注: 合成効果音は public/sounds/synth-keyboard-click.js で
 * ダウンロードすることができます。
 */

// 効果音のキャッシュ
const soundCache = {
  click: null,
  error: null,
  success: null,
};

// 音量設定 (0.0 - 1.0)
const VOLUME_SETTINGS = {
  click: 0.3, // 少し小さめの音量に調整
  error: 0.2, // エラー音は控えめに
  success: 0.3,
};

// オーディオコンテキストのシングルトン
let audioContext = null;

/**
 * キーボード効果音ユーティリティ
 */
class KeyboardSoundUtils {
  /**
   * オーディオコンテキストを取得または作成
   * @returns {AudioContext} オーディオコンテキスト
   */
  static getAudioContext() {
    if (!audioContext && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
      } catch (e) {
        console.warn('[KeyboardSoundUtils] AudioContextの作成に失敗:', e);
        return null;
      }
    }
    return audioContext;
  }

  /**
   * クリック音を再生
   */
  static playClickSound() {
    // パフォーマンスを考慮して実装しない場合は関数を追加
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // シンプルなサイン波でクリック音を生成
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(VOLUME_SETTINGS.click, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('[KeyboardSoundUtils] クリック音の再生に失敗:', e);
    }
  }

  /**
   * エラー音を再生
   */
  static playErrorSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // エラー音 - 低い音から高い音へ
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(VOLUME_SETTINGS.error, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('[KeyboardSoundUtils] エラー音の再生に失敗:', e);
    }
  }

  /**
   * 成功音を再生
   */
  static playSuccessSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      // 成功音 - 上昇する短い音
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(VOLUME_SETTINGS.success, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('[KeyboardSoundUtils] 成功音の再生に失敗:', e);
    }
  }
}

export default KeyboardSoundUtils;
