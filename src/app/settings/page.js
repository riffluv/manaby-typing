'use client';

import { useState, useEffect } from 'react';
import styles from './settings.module.css';
import ProcessingModeSelector from '../../components/ProcessingModeSelector';
import { useRouter } from 'next/navigation';
import scoreWorkerManager from '../../utils/ScoreWorkerManager';
import useProcessingMode from '../../hooks/useProcessingMode';

/**
 * ゲーム設定ページ
 */
export default function Settings() {
  const router = useRouter();
  const { modes, isInitialized } = useProcessingMode();
  const [mounted, setMounted] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebWorkerSupported, setIsWebWorkerSupported] = useState(true);

  // クライアント側でのみレンダリングを行う
  useEffect(() => {
    setMounted(true);
    
    // WebWorkerサポート状態を確認
    const isSupported = typeof Worker !== 'undefined' && typeof window !== 'undefined';
    setIsWebWorkerSupported(isSupported && !scoreWorkerManager.fallbackMode);
  }, []);

  // WebWorkerとメインスレッドでスコア計算速度をテスト
  const runSpeedTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // テスト用データを作成（重い計算になるようにデータを作成）
      const testData = {
        correctKeyCount: 1500,
        missCount: 20,
        typingTime: 60000, // 1分
        textLength: 2000,
        level: 'hard'
      };

      // WebWorkerがサポートされているか確認
      if (!isWebWorkerSupported) {
        setTestResult({
          error: 'このブラウザはWebWorkerをサポートしていないか、初期化に失敗したため、テストを実行できません。',
          workerTime: 'N/A',
          mainThreadTime: '計測中...'
        });
        
        // メインスレッドモードのみテスト
        const mainThreadStartTime = performance.now();
        
        const mainThreadResult = await new Promise(resolve => {
          scoreWorkerManager.calculateScore(testData, result => {
            resolve(result);
          });
        });
        
        const mainThreadTime = performance.now() - mainThreadStartTime;
        
        setTestResult({
          error: 'WebWorkerは非対応のためテストされません',
          workerTime: 'N/A',
          mainThreadTime: mainThreadTime.toFixed(2),
          workerScore: 'N/A',
          mainThreadScore: mainThreadResult.score,
          workerSupported: false
        });
        
        setIsLoading(false);
        return;
      }

      // WebWorkerモードでテスト
      const workerModeResult = await scoreWorkerManager.setProcessingModes({ calculation: 'worker' });

      if (workerModeResult.adjusted) {
        setTestResult({
          error: 'WebWorkerモードへの切り替えに失敗しました。このブラウザではWebWorkerをサポートしていないか、初期化に失敗しています。',
          workerTime: 'N/A',
          mainThreadTime: '計測中...'
        });
        
        // メインスレッドモードのみテスト
        const mainThreadStartTime = performance.now();
        
        const mainThreadResult = await new Promise(resolve => {
          scoreWorkerManager.calculateScore(testData, result => {
            resolve(result);
          });
        });
        
        const mainThreadTime = performance.now() - mainThreadStartTime;
        
        setTestResult({
          error: 'WebWorkerは非対応のためテストされません',
          workerTime: 'N/A',
          mainThreadTime: mainThreadTime.toFixed(2),
          workerScore: 'N/A',
          mainThreadScore: mainThreadResult.score,
          workerSupported: false
        });
        
        setIsLoading(false);
        return;
      }

      // 少し待機してモードが反映されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 200));

      // WorkerモードでのパフォーマンスをA/Bテスト
      const workerStartTime = performance.now();

      const workerResult = await new Promise(resolve => {
        scoreWorkerManager.calculateScore(testData, result => {
          resolve(result);
        });
      });

      const workerTime = performance.now() - workerStartTime;

      // メインスレッドモードでテスト
      scoreWorkerManager.setProcessingModes({ calculation: 'main-thread' });

      // 少し待機してモードが反映されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 200));

      // メインスレッドモードでのパフォーマンスをテスト
      const mainThreadStartTime = performance.now();

      const mainThreadResult = await new Promise(resolve => {
        scoreWorkerManager.calculateScore(testData, result => {
          resolve(result);
        });
      });

      const mainThreadTime = performance.now() - mainThreadStartTime;

      // 元の設定を復元
      scoreWorkerManager.setProcessingModes({ calculation: modes.calculation });

      // 結果を表示
      setTestResult({
        workerTime: workerTime.toFixed(2),
        mainThreadTime: mainThreadTime.toFixed(2),
        difference: ((mainThreadTime / workerTime) - 1) * 100,
        workerScore: workerResult.score,
        mainThreadScore: mainThreadResult.score,
        workerSupported: true
      });
    } catch (error) {
      console.error('スピードテストエラー:', error);
      setTestResult({ 
        error: error.message || 'テスト実行中に予期せぬエラーが発生しました',
        workerSupported: isWebWorkerSupported
      });
      
      // 元の設定を復元
      scoreWorkerManager.setProcessingModes({ calculation: modes.calculation });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>ゲーム設定</h1>
        <button
          className={styles.backButton}
          onClick={() => router.push('/')}
        >
          メインメニューに戻る
        </button>
      </div>

      <div className={styles.section}>
        <h2>処理モード設定</h2>
        <p>タイピングゲームの処理方法を設定できます。パフォーマンスに影響します。</p>
        <div className={styles.settingStatus}>
          <div className={isInitialized ? styles.settingsLoaded : styles.settingsLoading}>
            {isInitialized ? '設定が読み込まれました' : '設定を読み込み中...'}
          </div>
          <div className={isWebWorkerSupported ? styles.supportStatus : styles.unsupportedStatus}>
            WebWorker: {isWebWorkerSupported ? '対応' : '非対応'}
          </div>
        </div>
        <ProcessingModeSelector />
      </div>

      <div className={styles.section}>
        <h2>WebWorker診断</h2>
        <p>ブラウザのWebWorkerサポート状況と関連問題を診断します</p>
        <button 
          className={styles.diagnosticButton}
          onClick={() => {
            if (typeof window !== 'undefined') {
              // 新しいウィンドウで診断スクリプトを開く
              window.open('/worker-test.html', '_blank', 'width=800,height=600');
            }
          }}
        >
          詳細診断を実行
        </button>
        
        {!isWebWorkerSupported && (
          <div className={styles.warning}>
            <strong>注意:</strong> お使いのブラウザはWebWorkerをサポートしていないか、初期化に失敗しました。
            「詳細診断を実行」ボタンをクリックすると、詳細な診断情報が確認できます。
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>WebWorkerパフォーマンステスト</h2>
        <p>WebWorkerとメインスレッドのスコア計算速度を比較します</p>

        {!isWebWorkerSupported && (
          <div className={styles.warning}>
            <strong>注意:</strong> お使いのブラウザはWebWorkerをサポートしていないか、初期化に失敗しました。
            メインスレッドのパフォーマンスのみテストされます。
          </div>
        )}

        <button
          className={`${styles.testButton} ${isLoading ? styles.loading : ''}`}
          onClick={runSpeedTest}
          disabled={isLoading}
        >
          {isLoading ? 'テスト実行中...' : 'スピードテストを実行'}
        </button>

        {testResult && !testResult.error && (
          <div className={styles.testResults}>
            <h3>テスト結果</h3>
            <div className={styles.resultItem}>
              <span>WebWorker処理時間:</span>
              <strong>
                {testResult.workerSupported ? `${testResult.workerTime} ミリ秒` : '非対応'}
              </strong>
            </div>
            <div className={styles.resultItem}>
              <span>メインスレッド処理時間:</span>
              <strong>{testResult.mainThreadTime} ミリ秒</strong>
            </div>
            {testResult.workerSupported && (
              <div className={styles.resultItem}>
                <span>差異:</span>
                <strong className={testResult.difference > 0 ? styles.faster : styles.slower}>
                  {testResult.difference > 0
                    ? `WebWorkerが約${Math.abs(testResult.difference).toFixed(1)}%高速`
                    : `メインスレッドが約${Math.abs(testResult.difference).toFixed(1)}%高速`}
                </strong>
              </div>
            )}
            <div className={styles.resultNote}>
              スコア計算中も画面は完全に反応したままです。これがWebWorkerの最大の利点です。
            </div>
          </div>
        )}

        {testResult && testResult.error && (
          <div className={styles.errorMessage}>
            {testResult.error}
            {testResult.mainThreadTime && (
              <div className={styles.partialResult}>
                <p>メインスレッド処理時間: {testResult.mainThreadTime} ミリ秒</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
