/**
 * useProcessingMode.js
 * 処理モードを管理するためのカスタムフック
 * 2025年5月9日
 */

import { useState, useEffect } from 'react';
import typingWorkerManager from '../utils/TypingWorkerManager';

/**
 * 処理モードを管理するカスタムフック
 * @param {Object} defaultModes デフォルトの処理モード設定
 */
export default function useProcessingMode(defaultModes = {
  typing: 'main-thread', // タイピングはメインスレッド推奨
  effects: 'worker',     // 派手な演出はWebWorker推奨
  statistics: 'worker'   // 統計処理はWebWorker推奨
}) {
  const [modes, setModes] = useState(defaultModes);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化時に一度だけモードを設定
  useEffect(() => {
    if (!isInitialized && typeof typingWorkerManager !== 'undefined') {
      // 現在の設定を取得
      const currentModes = {
        typing: typingWorkerManager.processingMode?.typing || defaultModes.typing,
        effects: typingWorkerManager.processingMode?.effects || defaultModes.effects,
        statistics: typingWorkerManager.processingMode?.statistics || defaultModes.statistics
      };

      // マネージャーに設定を適用
      typingWorkerManager.setProcessingModes(currentModes)
        .then(result => {
          console.log('[処理モード] 初期設定完了:', result);
          setModes(result.currentModes || currentModes);
          setIsInitialized(true);
        })
        .catch(error => {
          console.error('[処理モード] 初期設定エラー:', error);
          // エラー時でもローカル状態を更新
          setModes(currentModes);
          setIsInitialized(true);
        });
    }
  }, [isInitialized, defaultModes]);

  /**
   * 処理モードを変更する
   * @param {string} key モードのキー ('typing', 'effects', 'statistics')
   * @param {string} value 設定する値 ('worker', 'main-thread')
   * @returns {Promise} 設定結果のPromise
   */
  const changeMode = (key, value) => {
    if (!['typing', 'effects', 'statistics'].includes(key) ||
      !['worker', 'main-thread'].includes(value)) {
      return Promise.reject(new Error('無効なモード設定'));
    }

    const newModes = { ...modes, [key]: value };

    return typingWorkerManager.setProcessingModes(newModes)
      .then(result => {
        setModes(result.currentModes || newModes);
        return result;
      });
  };

  return {
    modes,
    changeMode,
    isInitialized
  };
}
