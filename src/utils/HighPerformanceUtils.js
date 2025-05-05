/**
 * 高性能タイピングエンジン統合のためのユーティリティ
 * - WebAssembly、Web GPU、Offscreen Canvas など、最新技術のサポートチェックと初期化を行う
 */

import { initWebAssemblyModule } from '../wasm/typing-engine';
import { initWebGPU, isWebGPUSupported } from './webgpu/WebGPUUtils';

// テクノロジーサポート状態
let wasmSupported = null;
let webGpuSupported = null;
let offscreenSupported = null;
let initialized = false;

/**
 * WebAssemblyのサポート確認
 * @returns {boolean} サポート状況
 */
export function isWebAssemblySupported() {
  if (wasmSupported !== null) return wasmSupported;

  try {
    // WebAssemblyオブジェクトの存在とインスタンス化テスト
    if (typeof WebAssembly === 'object' &&
      typeof WebAssembly.instantiate === 'function' &&
      typeof WebAssembly.compile === 'function') {

      // 簡単なWASMモジュールをテスト
      const module = new WebAssembly.Module(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00
      ]));

      if (module instanceof WebAssembly.Module &&
        new WebAssembly.Instance(module) instanceof WebAssembly.Instance) {
        wasmSupported = true;
        return true;
      }
    }
  } catch (e) {
    console.error('[HighPerformanceUtils] WebAssembly検出エラー:', e);
  }

  wasmSupported = false;
  return false;
}

/**
 * Offscreen Canvasのサポート確認
 * @returns {boolean} サポート状況
 */
export function isOffscreenCanvasSupported() {
  if (offscreenSupported !== null) return offscreenSupported;

  try {
    offscreenSupported = typeof OffscreenCanvas === 'function' &&
      'transferControlToOffscreen' in document.createElement('canvas');
    return offscreenSupported;
  } catch (e) {
    console.error('[HighPerformanceUtils] OffscreenCanvas検出エラー:', e);
    offscreenSupported = false;
    return false;
  }
}

/**
 * すべてのハイパフォーマンスAPIのサポート状態を確認
 * @returns {Object} 各APIのサポート状況
 */
export function checkSupportedFeatures() {
  return {
    webassembly: isWebAssemblySupported(),
    webgpu: isWebGPUSupported(),
    offscreenCanvas: isOffscreenCanvasSupported()
  };
}

/**
 * 高性能エンジンの初期化
 * 利用可能なテクノロジーを自動検出して初期化します
 * @returns {Promise<Object>} 初期化結果
 */
export async function initHighPerformanceEngine() {
  if (initialized) {
    return {
      webassembly: wasmSupported,
      webgpu: webGpuSupported,
      offscreenCanvas: offscreenSupported
    };
  }

  // WebAssembly初期化
  if (isWebAssemblySupported()) {
    try {
      await initWebAssemblyModule();
      console.log('[HighPerformanceUtils] WebAssembly初期化完了');
    } catch (e) {
      console.error('[HighPerformanceUtils] WebAssembly初期化エラー:', e);
      wasmSupported = false;
    }
  }

  // Web GPU初期化
  if (isWebGPUSupported()) {
    try {
      const device = await initWebGPU();
      webGpuSupported = !!device;
      console.log('[HighPerformanceUtils] WebGPU初期化完了:', !!device);
    } catch (e) {
      console.error('[HighPerformanceUtils] WebGPU初期化エラー:', e);
      webGpuSupported = false;
    }
  } else {
    webGpuSupported = false;
  }

  // Offscreen Canvas対応のみ確認（初期化は特に必要なし）
  offscreenSupported = isOffscreenCanvasSupported();

  initialized = true;

  return {
    webassembly: wasmSupported,
    webgpu: webGpuSupported,
    offscreenCanvas: offscreenSupported
  };
}

/**
 * ブラウザ環境ごとに最適な実装を選択するためのヘルパー関数
 * @param {Object} implementations 実装オプション
 * @param {Function} implementations.webassembly WebAssembly実装
 * @param {Function} implementations.webgpu WebGPU実装
 * @param {Function} implementations.standard 標準実装
 * @returns {Function} 環境に最適な実装
 */
export function selectOptimalImplementation(implementations) {
  const { webassembly, webgpu, standard } = implementations;

  // サポート状況に応じて選択
  if (wasmSupported && webassembly) {
    return webassembly;
  } else if (webGpuSupported && webgpu) {
    return webgpu;
  } else {
    return standard;
  }
}

/**
 * タイピング判定関数の最適化バージョンを取得
 * @returns {Function} 最適化されたタイピング判定関数
 */
export function getOptimalTypingValidator() {
  return selectOptimalImplementation({
    webassembly: (input, expected) => {
      // WebAssemblyで実装されたタイピング判定
      try {
        if (window.wasmTypingModule && window.wasmTypingModule.validateInput) {
          return window.wasmTypingModule.validateInput(input, expected);
        }
      } catch (e) {
        console.error('[HighPerformanceUtils] WASM validateInput エラー:', e);
      }

      // フォールバック
      return input === expected;
    },
    standard: (input, expected) => {
      // JavaScript標準実装
      return input === expected;
    }
  });
}

/**
 * スコア計算関数の最適化バージョンを取得
 * @returns {Function} 最適化されたスコア計算関数
 */
export function getOptimalScoreCalculator() {
  return selectOptimalImplementation({
    webassembly: (speed, accuracy, combo) => {
      // WebAssemblyで実装されたスコア計算
      try {
        if (window.wasmTypingModule && window.wasmTypingModule.calculateScore) {
          return window.wasmTypingModule.calculateScore(speed, accuracy, combo);
        }
      } catch (e) {
        console.error('[HighPerformanceUtils] WASM calculateScore エラー:', e);
      }

      // フォールバック
      return Math.round(speed * 100 + accuracy * 200 + combo * 50);
    },
    standard: (speed, accuracy, combo) => {
      // JavaScript標準実装
      return Math.round(speed * 100 + accuracy * 200 + combo * 50);
    }
  });
}

/**
 * レンダリング関数の最適化バージョンを取得
 * @returns {Object} 最適化されたレンダリング関連関数
 */
export function getOptimalRenderers() {
  return {
    useWebGPU: webGpuSupported,
    useOffscreenCanvas: offscreenSupported
  };
}

/**
 * パフォーマンスデバッグ情報を取得
 * @returns {Object} パフォーマンス関連情報
 */
export function getPerformanceInfo() {
  return {
    features: {
      webassembly: wasmSupported,
      webgpu: webGpuSupported,
      offscreenCanvas: offscreenSupported
    },
    hardware: {
      cores: navigator.hardwareConcurrency || 'unknown',
      memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'unknown',
      platform: navigator.platform || 'unknown'
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language
    }
  };
}