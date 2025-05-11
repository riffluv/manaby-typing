'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// WorkerTypingGameをクライアントサイドでのみ動的にインポート
const WorkerTypingGame = dynamic(
  () => import('../../components/typing/WorkerTypingGame'),
  {
    ssr: false,
    loading: () => <div>ゲームをロード中...</div>
  }
);

export default function WorkerTypingPage() {
  return (
    <div className="container">
      <h1>Web Workerベースのタイピングゲーム</h1>
      <p>
        このページではWeb Workerを活用して、メインスレッドとWorkerを分離したタイピングゲームを実装しています。
      </p>
      <p>
        <b>メインスレッド：</b> タイピング判定と状態管理<br />
        <b>アニメーションWorker：</b> キーボードのアニメーション計算<br />
        <b>エフェクトWorker：</b> 効果音や視覚エフェクトの処理
      </p>

      <div className="game-container">
        <WorkerTypingGame />
      </div>

      <div className="explanation">
        <h2>実装の詳細</h2>
        <p>
          この実装では、以下のファイルを使用しています：
        </p>
        <ul>
          <li><code>src/workers/animation-worker.js</code> - キーボードアニメーション用Worker</li>
          <li><code>src/workers/effects-worker.js</code> - エフェクト処理用Worker</li>
          <li><code>src/hooks/useAnimationWorker.js</code> - アニメーションWorker用フック</li>
          <li><code>src/hooks/useEffectsWorker.js</code> - エフェクトWorker用フック</li>
          <li><code>src/utils/worker-manager.js</code> - Worker作成・管理ユーティリティ</li>
          <li><code>src/components/typing/WorkerCanvasKeyboard.js</code> - Worker対応キーボード</li>
        </ul>
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        h1 {
          margin-bottom: 1rem;
          color: #FF8C00;
        }
        
        .game-container {
          margin: 2rem 0;
          padding: 1rem;
          border-radius: 8px;
          background-color: rgba(25, 30, 45, 0.4);
        }
        
        .explanation {
          margin-top: 2rem;
          padding: 1rem;
          background-color: rgba(10, 13, 20, 0.8);
          border-radius: 8px;
        }
        
        .explanation h2 {
          color: #FF8C00;
        }
        
        .explanation code {
          background-color: #0F141E;
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
        }
        
        ul {
          padding-left: 1.5rem;
        }
        
        li {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}
