'use client';

/**
 * useOptimizedRenderer.js
 * レンダリングパフォーマンスを最適化するためのカスタムフック
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * 高頻度更新を最適化するためのフック
 * アニメーションフレームを利用して更新頻度を制御
 *
 * @param {Function} callback - 実行する処理
 * @param {number} minInterval - 最小更新間隔（ms）
 * @returns {Function} 最適化された更新関数
 */
export function useOptimizedRenderer(callback, minInterval = 16) {
  const lastRenderTimeRef = useRef(0);
  const pendingUpdateRef = useRef(false);
  const callbackRef = useRef(callback);

  // callbackの参照を最新に保つ
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      pendingUpdateRef.current = false;
    };
  }, []);

  // 最適化された更新関数
  const scheduleUpdate = useCallback(
    (data) => {
      const now = performance.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;

      // 更新間隔が短すぎる場合はスケジュール
      if (timeSinceLastRender < minInterval) {
        if (!pendingUpdateRef.current) {
          pendingUpdateRef.current = true;

          // requestAnimationFrameを使用して次のフレームで実行
          requestAnimationFrame(() => {
            const currentTime = performance.now();
            lastRenderTimeRef.current = currentTime;
            pendingUpdateRef.current = false;
            callbackRef.current(data);
          });
        }
      } else {
        // 十分な時間が経過していれば即時実行
        lastRenderTimeRef.current = now;
        callbackRef.current(data);
      }
    },
    [minInterval]
  );

  return scheduleUpdate;
}

/**
 * イベントデバウンス用フック
 *
 * @param {Function} callback - 実行する処理
 * @param {number} delay - 遅延時間（ms）
 * @returns {Function} デバウンスされた関数
 */
export function useDebounce(callback, delay = 100) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  // callbackの参照を最新に保つ
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // デバウンスされた関数
  return useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export default useOptimizedRenderer;
