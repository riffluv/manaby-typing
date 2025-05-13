'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styles from '../../styles/common/PerformanceMonitor.module.css';

/**
 * パフォーマンスモニタリング用のコンポーネント
 * 2025年5月9日: リファクタリングでGameScreenから分離
 */
export function PerformanceDebugDisplay({ metrics = {}, className, style }) {
  // メトリクス表示用の整形
  const formattedMetrics = useMemo(() => {
    // メトリクスが空の場合
    if (!metrics || Object.keys(metrics).length === 0) {
      return {
        fps: 'N/A',
        frameTime: 'N/A',
        memoryUsage: 'N/A',
        renderTime: 'N/A',
        cacheHitRate: 'N/A',
        workerStatus: 'Unknown',
      };
    }

    // FPS計算用のヘルパー関数
    const formatFPS = (fps) => {
      if (fps === undefined || fps === null) return 'N/A';
      return fps.toFixed(1);
    };

    // ミリ秒表示用のヘルパー関数
    const formatMs = (ms) => {
      if (ms === undefined || ms === null) return 'N/A';
      return `${ms.toFixed(2)}ms`;
    };

    // メモリ表示用のヘルパー関数
    const formatMemory = (bytes) => {
      if (bytes === undefined || bytes === null) return 'N/A';
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      }
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // パーセント表示用のヘルパー関数
    const formatPercent = (value) => {
      if (value === undefined || value === null) return 'N/A';
      return `${value.toFixed(1)}%`;
    };

    // キャッシュヒット率計算
    let cacheHitRate = 'N/A';
    if (
      metrics.cacheInfo &&
      metrics.cacheInfo.requests !== undefined &&
      metrics.cacheInfo.requests > 0
    ) {
      const hitRate =
        (metrics.cacheInfo.hits / metrics.cacheInfo.requests) * 100;
      cacheHitRate = formatPercent(hitRate);
    } else if (metrics.cacheHitRatio !== undefined) {
      cacheHitRate = formatPercent(metrics.cacheHitRatio * 100);
    }

    return {
      fps: formatFPS(metrics.fps || metrics.FPS),
      frameTime: formatMs(metrics.frameTime || metrics.frametime),
      memoryUsage: formatMemory(metrics.memoryUsage || metrics.memory),
      renderTime: formatMs(metrics.renderTime || metrics.rendertime),
      cacheHitRate,
      workerStatus:
        metrics.workerStatus || (metrics.workerPerfInfo ? 'Active' : 'Unknown'),
    };
  }, [metrics]);

  return (
    <div
      className={`${styles.performance_monitor} ${className || ''}`}
      style={style}
    >
      <div className={styles.monitor_header}>
        <span className={styles.title}>パフォーマンスモニター</span>
        <div
          className={styles.indicator_light}
          title={
            formattedMetrics.fps !== 'N/A' &&
            parseFloat(formattedMetrics.fps) < 30
              ? 'パフォーマンス警告'
              : 'パフォーマンス正常'
          }
          data-status={
            formattedMetrics.fps !== 'N/A' &&
            parseFloat(formattedMetrics.fps) < 30
              ? 'warning'
              : 'normal'
          }
        />
      </div>

      <table className={styles.metrics_table}>
        <tbody>
          <tr>
            <td>FPS:</td>
            <td
              className={
                formattedMetrics.fps !== 'N/A' &&
                parseFloat(formattedMetrics.fps) < 30
                  ? styles.warning_value
                  : styles.normal_value
              }
            >
              {formattedMetrics.fps}
            </td>
          </tr>
          <tr>
            <td>フレーム時間:</td>
            <td>{formattedMetrics.frameTime}</td>
          </tr>
          <tr>
            <td>レンダー時間:</td>
            <td>{formattedMetrics.renderTime}</td>
          </tr>
          <tr>
            <td>メモリ使用:</td>
            <td>{formattedMetrics.memoryUsage}</td>
          </tr>
          <tr>
            <td>キャッシュヒット率:</td>
            <td>{formattedMetrics.cacheHitRate}</td>
          </tr>
          <tr>
            <td>Webワーカー:</td>
            <td>{formattedMetrics.workerStatus}</td>
          </tr>
        </tbody>
      </table>

      {/* 詳細情報があれば表示 */}
      {metrics.details && (
        <details className={styles.details_section}>
          <summary>詳細情報</summary>
          <pre className={styles.details_content}>
            {JSON.stringify(metrics.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/**
 * リアルタイムパフォーマンスモニタリングフック
 * パフォーマンスメトリクスをリアルタイムで収集
 */
export function usePerformanceMonitoring(options = {}) {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheInfo: { requests: 0, hits: 0 },
    workerStatus: 'Initializing',
    timestamp: Date.now(),
  });

  // 初期設定
  const config = useMemo(
    () => ({
      sampleRate: options.sampleRate || 1000, // 1秒ごとに更新
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
      enableWorkerMonitoring: options.enableWorkerMonitoring !== false,
      monitorWorkerPath:
        options.monitorWorkerPath || '/workers/typing-worker.js',
      ...options,
    }),
    [options]
  );

  useEffect(() => {
    // モニタリング用の変数
    let frameCount = 0;
    let lastTime = performance.now();
    let frameTimeSum = 0;
    let animationFrameId = null;
    let intervalId = null;

    // FPS測定用のフレームカウンター
    const countFrame = (timestamp) => {
      const now = performance.now();
      const elapsed = now - lastTime;

      frameCount++;
      frameTimeSum += elapsed;

      lastTime = now;
      animationFrameId = requestAnimationFrame(countFrame);
    };

    // メトリクス収集と状態更新
    const updateMetrics = () => {
      // FPSと平均フレーム時間を計算
      const avgFPS = frameCount * (1000 / config.sampleRate);
      const avgFrameTime = frameCount > 0 ? frameTimeSum / frameCount : 0;

      // メモリ使用量を取得（対応ブラウザのみ）
      let memoryUsage = 0;
      if (
        config.enableMemoryMonitoring &&
        window.performance &&
        window.performance.memory
      ) {
        memoryUsage = window.performance.memory.usedJSHeapSize;
      }

      // 新しいメトリクスを設定
      setMetrics((prev) => ({
        ...prev,
        fps: avgFPS,
        frameTime: avgFrameTime,
        memoryUsage,
        timestamp: Date.now(),
      }));

      // カウンターをリセット
      frameCount = 0;
      frameTimeSum = 0;
    };

    // モニタリング開始
    animationFrameId = requestAnimationFrame(countFrame);
    intervalId = setInterval(updateMetrics, config.sampleRate);

    // Webワーカーのモニタリング
    let workerMonitoringId = null;
    if (
      config.enableWorkerMonitoring &&
      typeof window !== 'undefined' &&
      window.Worker
    ) {
      const checkWorkerStatus = () => {
        try {
          // 既存のワーカーとの通信を試みる（直接インスタンス化はしない）
          if (window.typingWorkerManager) {
            window.typingWorkerManager
              .getPerformanceMetrics()
              .then((workerMetrics) => {
                setMetrics((prev) => ({
                  ...prev,
                  workerStatus: 'Active',
                  workerPerfInfo: workerMetrics,
                }));
              })
              .catch(() => {
                setMetrics((prev) => ({
                  ...prev,
                  workerStatus: 'Error',
                }));
              });
          } else {
            setMetrics((prev) => ({
              ...prev,
              workerStatus: 'Not Available',
            }));
          }
        } catch (error) {
          setMetrics((prev) => ({
            ...prev,
            workerStatus: 'Error',
          }));
        }
      };

      // 5秒ごとにワーカー状態を確認
      workerMonitoringId = setInterval(checkWorkerStatus, 5000);
      checkWorkerStatus(); // 初回チェック
    }

    // クリーンアップ
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (workerMonitoringId) {
        clearInterval(workerMonitoringId);
      }
    };
  }, [config]);

  return metrics;
}

/**
 * usePerformanceMonitorフック - 互換性のためのエイリアス
 * GameController.jsとの互換性を維持するためのフック
 * @param {Object} options モニタリングオプション
 * @returns {Object} メトリクスとイベント記録関数
 */
export function usePerformanceMonitor(options = {}) {
  const metrics = usePerformanceMonitoring(options);

  // 入力イベント記録用の関数を提供
  const recordInputEvent = useCallback(() => {
    const startTime = performance.now();
    let duration = 0;

    // 計測完了関数
    const end = () => {
      duration = performance.now() - startTime;
      return { duration };
    };

    return { end, startTime };
  }, []);

  return {
    metrics,
    recordInputEvent,
  };
}

/**
 * パフォーマンスモニターコンポーネント
 */
export default function PerformanceMonitor({ options, className, style }) {
  const metrics = usePerformanceMonitoring(options);

  return (
    <PerformanceDebugDisplay
      metrics={metrics}
      className={className}
      style={style}
    />
  );
}
