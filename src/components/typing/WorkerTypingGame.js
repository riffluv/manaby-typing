'use client';

import React, { useState, useEffect } from 'react';
import WorkerCanvasKeyboard from './WorkerCanvasKeyboard';
import useAnimationWorker from '../../hooks/useAnimationWorker';
import useEffectsWorker from '../../hooks/useEffectsWorker';

/**
 * Worker対応のタイピングゲーム画面
 * メインスレッドはタイピング処理に集中し、演出はWorkerに移譲
 */
const WorkerTypingGame = () => {
  // タイピングの状態（メインスレッドで管理）
  const [typingState, setTypingState] = useState({
    nextKey: 'a',
    lastPressedKey: '',
    isError: false,
    score: 0,
  });

  // アニメーションWorker
  const { animationState, startAnimation } = useAnimationWorker();

  // エフェクトWorker
  const { effectsState, startEffects, addKeyEffect, playSound } =
    useEffectsWorker();

  // コンポーネントがマウントされたらWorker処理を開始
  useEffect(() => {
    startAnimation();
    startEffects();

    // キーボードイベントリスナー
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      // 基本タイピング判定ロジック（メインスレッド）
      const isCorrect = key === typingState.nextKey.toLowerCase();

      // キー状態更新
      setTypingState((prev) => ({
        ...prev,
        lastPressedKey: key,
        isError: !isCorrect,
        score: isCorrect ? prev.score + 1 : prev.score,
        // 簡易デモのため、正解時は次のキーをランダムに設定
        nextKey: isCorrect ? getRandomKey() : prev.nextKey,
      }));

      // エフェクトWorkerにキー入力を通知
      addKeyEffect(key, !isCorrect);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [startAnimation, startEffects, addKeyEffect, typingState.nextKey]);

  // ランダムなキーを取得
  const getRandomKey = () => {
    const keys = 'abcdefghijklmnopqrstuvwxyz';
    return keys.charAt(Math.floor(Math.random() * keys.length));
  };

  return (
    <div className="typing-game-container">
      <h1>Worker対応タイピングゲーム</h1>

      <div className="typing-stats">
        <p>スコア: {typingState.score}</p>
        <p>次のキー: {typingState.nextKey.toUpperCase()}</p>
        {typingState.lastPressedKey && (
          <p>
            最後に押されたキー: {typingState.lastPressedKey.toUpperCase()}
            {typingState.isError ? ' (不正解)' : ' (正解)'}
          </p>
        )}
      </div>

      {/* Worker対応のキーボードコンポーネント */}
      <WorkerCanvasKeyboard
        nextKey={typingState.nextKey}
        lastPressedKey={typingState.lastPressedKey}
        isError={typingState.isError}
      />

      {/* 効果情報の表示（デバッグ用） */}
      <div className="debug-info">
        <details>
          <summary>デバッグ情報</summary>
          <p>
            アニメーションWorker: {animationState.isRunning ? '実行中' : '停止'}
          </p>
          <p>エフェクトWorker: {effectsState.isRunning ? '実行中' : '停止'}</p>
          <p>アクティブエフェクト数: {effectsState.effects.length}</p>
        </details>
      </div>

      <style jsx>{`
        .typing-game-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .typing-stats {
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(10, 13, 20, 0.8);
          border-radius: 4px;
          width: 100%;
        }

        .typing-stats p {
          margin: 5px 0;
        }

        .debug-info {
          margin-top: 20px;
          width: 100%;
          font-size: 0.9rem;
          color: #888;
        }
      `}</style>
    </div>
  );
};

export default WorkerTypingGame;
