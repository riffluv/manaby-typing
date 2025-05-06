import React, { useState, useEffect } from 'react';
import { useTypingGame } from '../../hooks/useTypingGame';
import { useSimpleTypingAdapter } from '../../hooks/useSimpleTypingAdapter';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import styles from '../../styles/typing/SimpleTypingTester.module.css';

/**
 * シンプルタイピング表示のテスト用コンポーネント
 * 既存のタイピングロジックを使いながら、表示だけをシンプル化したテスト
 */
const SimpleTypingTester = () => {
  // テスト用の問題
  const [problem, setProblem] = useState({
    displayText: 'テストの日本語',
    kanaText: 'てすとのにほんご', // kana → kanaTextに変更
    romaji: [
      ['te'], ['su'], ['to'], ['no'], ['ni'], ['ho'], ['n'], ['go']
    ]
  });

  // 既存のタイピングフックを使用
  const typingHook = useTypingGame({
    initialProblem: problem,
    playSound: true
  });

  // シンプル表示用にアダプターでプロパティを変換
  const simpleProps = useSimpleTypingAdapter(typingHook);

  // キーボード入力を処理するイベントリスナー
  useEffect(() => {
    const handleKeyDown = (e) => {
      // IME確定中は処理しない
      if (e.isComposing) return;

      // 特殊キーは無視
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

      // タイピング処理を行う
      typingHook.handleInput(e.key);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [typingHook]);

  // 別の問題に変更するテスト機能
  const changeToProblem2 = () => {
    setProblem({
      displayText: 'こんにちは世界',
      kanaText: 'こんにちはせかい', // kana → kanaTextに変更
      romaji: [
        ['ko'], ['n'], ['ni'], ['chi'], ['ha'], ['se'], ['ka'], ['i']
      ]
    });
  };

  return (
    <div className={styles.testerContainer}>
      <h2 className={styles.testerTitle}>シンプルタイピング表示テスト</h2>

      {/* 問題表示 */}
      <div className={styles.problemText}>
        <div className={styles.japaneseText}>{problem.displayText}</div>
        <div className={styles.kanaText}>{problem.kanaText}</div>
      </div>

      {/* シンプル化したタイピング表示 */}
      <div className={styles.typingDisplayWrapper}>
        <SimpleTypingDisplay
          romaji={simpleProps.romaji}
          typedLength={simpleProps.typedLength}
          nextChar={simpleProps.nextChar}
          isError={simpleProps.isError}
        />
      </div>

      {/* テスト用コントロールパネル */}
      <div className={styles.controlPanel}>
        <button
          onClick={changeToProblem2}
          className={styles.controlButton}
        >
          問題を変更
        </button>
        <button
          onClick={() => typingHook.initializeSession(problem)}
          className={styles.controlButton}
        >
          リセット
        </button>
      </div>

      {/* ステータス表示（デバッグ用） */}
      <div className={styles.statusPanel}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>入力状況:</span>
          <span className={styles.statusValue}>
            {simpleProps.isCompleted ? '完了' : '入力中'}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>タイプ数:</span>
          <span className={styles.statusValue}>
            {simpleProps.typedLength} / {simpleProps.romaji?.length || 0}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>次の入力:</span>
          <span className={styles.statusValue}>
            {simpleProps.nextChar || '-'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SimpleTypingTester;