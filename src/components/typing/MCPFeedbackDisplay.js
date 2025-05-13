// filepath: c:\Users\hr-hm\Desktop\typing-game6\src\components\typing\MCPFeedbackDisplay.js
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TypingEvents } from '../../utils/mcp/TypingProtocol';
import styles from '../../styles/typing/MCPFeedbackDisplay.module.css';

/**
 * MCPアーキテクチャのリアルタイムフィードバックコンポーネント
 * モデルからの更新イベントをサブスクライブして、リアルタイムのフィードバックを表示します
 * 
 * @param {Object} props コンポーネントのプロパティ
 * @param {Object} props.mcpContext MCPコンテキスト
 * @param {string} props.position 表示位置 ('top', 'bottom', 'left', 'right')
 * @param {boolean} props.showHistory 履歴を表示するかどうか
 * @param {boolean} props.mini ミニ表示モード
 * @returns {JSX.Element} リアルタイムフィードバックコンポーネント
 */
const MCPFeedbackDisplay = ({
  mcpContext,
  position = 'right',
  showHistory = true,
  mini = false
}) => {
  // 状態の定義
  const [feedbackData, setFeedbackData] = useState({
    accuracy: 100,
    kpm: 0,
    combo: 0,
    lastKeyCorrect: null,
    lastKey: null
  });

  const [inputHistory, setInputHistory] = useState([]);
  const historyRef = useRef(null);

  // イベントリスナーの登録
  useEffect(() => {
    if (!mcpContext || !mcpContext.isActive || typeof window === 'undefined' || !window._mcp) return;

    // 入力処理イベントのリスナー
    const handleInputProcessed = (data) => {
      const { key, result } = data || {};

      setFeedbackData(prev => ({
        accuracy: result?.accuracy || prev.accuracy,
        kpm: result?.kpm || prev.kpm,
        combo: result?.comboCount || prev.combo,
        lastKeyCorrect: result?.isCorrect,
        lastKey: key
      }));

      // 履歴に追加
      if (showHistory && key) {
        setInputHistory(prev => {
          const newHistory = [...prev, {
            key,
            isCorrect: result?.isCorrect || false,
            timestamp: Date.now()
          }];
          // 最大50件まで保持
          return newHistory.slice(-50);
        });
      }
    };

    // 状態更新イベントのリスナー
    const handleStateUpdated = (data) => {
      const { state } = data || {};
      if (state) {
        setFeedbackData(prev => ({
          ...prev,
          accuracy: state.stats?.accuracy || prev.accuracy,
          kpm: state.stats?.kpm || prev.kpm,
          combo: state.stats?.comboCount || 0
        }));
      }
    };

    // MCPイベントにリスナーを登録（window._mcpのonメソッドを使用）
    let unsubInput;
    let unsubState;

    try {
      // onメソッドが利用可能な場合はそれを使用
      if (typeof window._mcp?.on === 'function') {
        unsubInput = window._mcp.on(TypingEvents.INPUT_PROCESSED, handleInputProcessed);
        unsubState = window._mcp.on(TypingEvents.STATE_UPDATED, handleStateUpdated);
        console.log('[MCPFeedbackDisplay] MCPイベントリスナーを登録しました');
      } else {
        console.warn('[MCPFeedbackDisplay] MCPのonメソッドが見つかりません');
      }
    } catch (error) {
      console.error('[MCPFeedbackDisplay] イベントリスナー登録エラー:', error);
    }

    // クリーンアップ
    return () => {
      // リスナーの登録解除
      if (typeof unsubInput === 'function') unsubInput();
      if (typeof unsubState === 'function') unsubState();

      // または古い方法で直接offメソッドを使って解除
      if (typeof window._mcp?.off === 'function') {
        try {
          window._mcp.off(TypingEvents.INPUT_PROCESSED, handleInputProcessed);
          window._mcp.off(TypingEvents.STATE_UPDATED, handleStateUpdated);
        } catch (e) {
          console.error('[MCPFeedbackDisplay] イベントリスナー削除エラー:', e);
        }
      }
    };
  }, [mcpContext, showHistory]);

  // 履歴が更新されたらスクロールを一番下に
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [inputHistory]);

  // キー正誤のスタイルを取得
  const getKeyStatusStyle = (isCorrect) => {
    if (isCorrect === null) return '';
    return isCorrect ? styles.correctKey : styles.incorrectKey;
  };

  // ミニ表示モードの場合
  if (mini) {
    return (
      <div className={`${styles.miniFeedbackContainer} ${styles[`position-${position}`]}`}>
        <div className={styles.miniStats}>
          <span className={styles.kpm}>{feedbackData.kpm}</span>
          <span className={styles.accuracy}>{feedbackData.accuracy}%</span>
        </div>
        {feedbackData.lastKey && (
          <div className={`${styles.lastKey} ${getKeyStatusStyle(feedbackData.lastKeyCorrect)}`}>
            {feedbackData.lastKey}
          </div>
        )}
      </div>
    );
  }

  // 通常表示モード
  return (
    <div className={`${styles.feedbackContainer} ${styles[`position-${position}`]}`}>
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>KPM</div>
          <div className={styles.statValue}>{feedbackData.kpm}</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>正確率</div>
          <div className={styles.statValue}>{feedbackData.accuracy}%</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statLabel}>コンボ</div>
          <div className={`${styles.statValue} ${feedbackData.combo >= 5 ? styles.highCombo : ''}`}>
            {feedbackData.combo}
          </div>
        </div>
      </div>

      {feedbackData.lastKey && (
        <div className={styles.lastKeyContainer}>
          <div className={styles.lastKeyLabel}>最後の入力</div>
          <div className={`${styles.lastKey} ${getKeyStatusStyle(feedbackData.lastKeyCorrect)}`}>
            {feedbackData.lastKey}
          </div>
        </div>
      )}

      {showHistory && (
        <div className={styles.historyContainer} ref={historyRef}>
          <div className={styles.historyTitle}>入力履歴</div>
          <div className={styles.keyHistory}>
            {inputHistory.map((entry, index) => (
              <span
                key={`${entry.key}-${index}-${entry.timestamp}`}
                className={`${styles.historyKey} ${entry.isCorrect ? styles.correctKey : styles.incorrectKey}`}
              >
                {entry.key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPFeedbackDisplay;