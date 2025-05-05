'use client';

import { useState, useEffect } from 'react';
import { isWebGPUSupported, initWebGPU } from '../../utils/webgpu/WebGPUUtils';
import WebGPUKeyboard from '../../components/typing/WebGPUKeyboard';
import styles from './page.module.css';

export default function WebGPUTestPage() {
  const [gpuSupported, setGpuSupported] = useState(null);
  const [adapterInfo, setAdapterInfo] = useState(null);
  const [nextKey, setNextKey] = useState('a');
  const [lastPressedKey, setLastPressedKey] = useState('');
  const [isError, setIsError] = useState(false);
  const [layout, setLayout] = useState('jp');

  // Web GPUサポートチェック
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isWebGPUSupported();
      setGpuSupported(supported);

      if (supported) {
        try {
          const device = await initWebGPU();
          if (device) {
            const adapter = await navigator.gpu.requestAdapter({
              powerPreference: 'high-performance'
            });
            if (adapter) {
              const info = await adapter.requestAdapterInfo();
              setAdapterInfo(info);
            }
          }
        } catch (err) {
          console.error('Web GPU初期化エラー:', err);
          setGpuSupported(false);
        }
      }
    };

    checkSupport();
  }, []);

  // キーボードイベントリスナー
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      setLastPressedKey(key);

      // 次のキーと一致するか確認
      if (key === nextKey.toLowerCase()) {
        // 正解の場合は次のキーをランダムに設定
        const keys = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const randomKey = keys.charAt(Math.floor(Math.random() * keys.length));
        setNextKey(randomKey);
        setIsError(false);
      } else {
        // 不正解の場合
        setIsError(true);
        setTimeout(() => {
          setIsError(false);
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nextKey]);

  return (
    <main className={styles.main}>
      <h1>Web GPU キーボードテスト</h1>

      <div className={styles.status}>
        <p>Web GPU対応状況: <strong>{
          gpuSupported === null ? '確認中...' :
            gpuSupported ? '対応' : '非対応'
        }</strong></p>

        {gpuSupported && adapterInfo && (
          <div className={styles.adapterInfo}>
            <h3>GPUアダプタ情報:</h3>
            <ul>
              <li><strong>ベンダー:</strong> {adapterInfo.vendor || '不明'}</li>
              <li><strong>アーキテクチャ:</strong> {adapterInfo.architecture || '不明'}</li>
              <li><strong>デバイス:</strong> {adapterInfo.device || '不明'}</li>
              <li><strong>説明:</strong> {adapterInfo.description || '情報なし'}</li>
            </ul>
          </div>
        )}

        {gpuSupported === false && (
          <div className={styles.warning}>
            <p>お使いのブラウザはWeb GPUに対応していません。</p>
            <p>Chrome 113以降、Edge 113以降、またはSafari 16.4以降の使用をお勧めします。</p>
          </div>
        )}
      </div>

      <div className={styles.keyboardContainer}>
        <h2>キーボードデモ</h2>
        <p>次に押すキー: <span className={styles.nextKey}>{nextKey}</span></p>
        <p>最後に押したキー: <span className={styles.lastKey}>{lastPressedKey || '(なし)'}</span></p>

        <div className={styles.layoutSwitch}>
          <button
            className={layout === 'jp' ? styles.active : ''}
            onClick={() => setLayout('jp')}
          >
            日本語配列
          </button>
          <button
            className={layout === 'en' ? styles.active : ''}
            onClick={() => setLayout('en')}
          >
            英語配列
          </button>
        </div>

        <WebGPUKeyboard
          nextKey={nextKey}
          lastPressedKey={lastPressedKey}
          isError={isError}
          layout={layout}
          className={styles.keyboard}
        />

        <p className={styles.instructions}>
          キーボードを押して、ハイライトされたキーと一致するか試してみてください。
          <br />
          正解すると次のキーがランダムに選ばれます。
        </p>
      </div>

      <div className={styles.performance}>
        <h2>パフォーマンスについて</h2>
        <p>
          Web GPUは従来のCanvas 2Dと比較して、以下の点で優れています：
        </p>
        <ul>
          <li>GPUハードウェアアクセラレーションによる高速描画</li>
          <li>多数の要素を同時描画する場合の効率的な処理</li>
          <li>複雑なエフェクトやアニメーションの滑らかな表示</li>
          <li>CPUリソースの節約とバッテリー効率の向上</li>
        </ul>
        <p>
          タイピングゲームでは、多数のキーの状態変化や色の変更が高速に行われるため、
          Web GPUの利点を活かすことができます。
        </p>
      </div>
    </main>
  );
}