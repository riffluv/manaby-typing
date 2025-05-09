/**
 * ProcessingModeSelector.js
 * 処理モードを選択するためのUIコンポーネント
 * タイピング処理をWebWorkerかメインスレッドのどちらで行うかを設定
 * 2025年5月9日
 */

import { useState, useEffect } from 'react';
import typingWorkerManager from '../../utils/TypingWorkerManager';
import useProcessingMode from '../../hooks/useProcessingMode';
import styles from '../../styles/common/ProcessingModeSelector.module.css';

/**
 * 処理モード選択コンポーネント
 */
export default function ProcessingModeSelector() {
  // カスタムフックを使用して処理モードを管理
  const { modes, changeMode, isInitialized } = useProcessingMode({
    typing: 'main-thread',  // デフォルトはメインスレッド
    effects: 'worker',      // デフォルトはWorker
    statistics: 'worker'    // デフォルトはWorker
  });

  // 設定パネルの表示/非表示
  const [isVisible, setIsVisible] = useState(false);

  // モードの変更を処理
  const handleModeChange = (key, value) => {
    changeMode(key, value)
      .then(result => {
        console.log('処理モード変更成功:', result);
      })
      .catch(error => {
        console.error('処理モード変更エラー:', error);
      });
  };

  // 表示切り替え
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.toggleButton}
        onClick={toggleVisibility}
        title="処理モード設定"
      >
        ⚙️
      </button>

      {isVisible && (
        <div className={styles.panel}>
          <h3 className={styles.title}>処理モード設定</h3>

          <div className={styles.modeGroup}>
            <label>タイピング処理：</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="typingMode"
                  checked={modes.typing === 'main-thread'}
                  onChange={() => handleModeChange('typing', 'main-thread')}
                />
                メインスレッド
              </label>
              <label>
                <input
                  type="radio"
                  name="typingMode"
                  checked={modes.typing === 'worker'}
                  onChange={() => handleModeChange('typing', 'worker')}
                />
                WebWorker
              </label>
            </div>
          </div>

          <div className={styles.modeGroup}>
            <label>エフェクト処理：</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="effectsMode"
                  checked={modes.effects === 'main-thread'}
                  onChange={() => handleModeChange('effects', 'main-thread')}
                />
                メインスレッド
              </label>
              <label>
                <input
                  type="radio"
                  name="effectsMode"
                  checked={modes.effects === 'worker'}
                  onChange={() => handleModeChange('effects', 'worker')}
                />
                WebWorker
              </label>
            </div>
          </div>

          <div className={styles.modeGroup}>
            <label>統計処理：</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="statisticsMode"
                  checked={modes.statistics === 'main-thread'}
                  onChange={() => handleModeChange('statistics', 'main-thread')}
                />
                メインスレッド
              </label>
              <label>
                <input
                  type="radio"
                  name="statisticsMode"
                  checked={modes.statistics === 'worker'}
                  onChange={() => handleModeChange('statistics', 'worker')}
                />
                WebWorker
              </label>
            </div>
          </div>

          <p className={styles.note}>
            タイピング入力はメインスレッド推奨<br />
            派手な演出はWorker推奨
          </p>

          <button
            className={styles.closeButton}
            onClick={toggleVisibility}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
