'use client';

import React from 'react';
import SoundDebugPanel from './SoundDebugPanel';
import { getStaticPath } from '@/utils/StaticPathUtils';

/**
 * サウンドデバッグページのコンポーネント
 * 詳細なサウンドシステムの診断と修正のためのUI
 */
export default function SoundDebugPage() {
  const [activeTab, setActiveTab] = React.useState('diagnose');
  const [diagnosticResults, setDiagnosticResults] = React.useState({
    running: false,
    completed: false,
    steps: [],
    summary: ''
  });

  // 診断を実行する
  const runDiagnostic = async () => {
    setDiagnosticResults({
      running: true,
      completed: false,
      steps: [{status: 'running', message: '診断を開始しています...'}],
      summary: ''
    });

    // 環境チェック
    await addStep('環境チェック中...', 'running');
    const isGitHubPages = typeof window !== 'undefined' && 
      window.location.hostname.includes('github.io');
    
    await addStep(
      `環境: ${isGitHubPages ? 'GitHub Pages' : 'ローカル開発'}, ` +
      `basePath: ${process.env.NEXT_PUBLIC_BASE_PATH || '未設定'}`,
      'success'
    );

    // AudioContext APIのチェック
    await addStep('Web Audio APIをチェック中...', 'running');
    const hasAudioContext = typeof window !== 'undefined' && 
      (window.AudioContext || window.webkitAudioContext);
    
    if (hasAudioContext) {
      await addStep('Web Audio APIが利用可能です', 'success');
    } else {
      await addStep('Web Audio APIが利用できません。このブラウザは非対応の可能性があります。', 'error');
    }

    // サウンドファイルのパス解決
    await addStep('サウンドファイルのパス解決をテスト中...', 'running');
    
    const testPaths = [
      '/sounds/hit05-1.mp3',
      '/sounds/hit04-1.mp3',
    ];
    
    for (const path of testPaths) {
      const resolvedPath = getStaticPath(path);
      await addStep(`パス解決: ${path} -> ${resolvedPath}`, 'info');
    }

    // サウンドロード可能性チェック
    await addStep('サウンドファイルの読み込みをテスト中...', 'running');
    
    try {
      const testPath = getStaticPath('/sounds/hit05-1.mp3');
      const response = await fetch(testPath, { method: 'HEAD' });
      
      if (response.ok) {
        await addStep(`サウンドファイルにアクセス可能です: ${testPath}`, 'success');
      } else {
        await addStep(`サウンドファイルにアクセスできません: ${testPath} (ステータス: ${response.status})`, 'error');
      }
    } catch (err) {
      await addStep(`サウンドファイルのテスト中にエラーが発生しました: ${err.message}`, 'error');
    }

    // 診断完了
    const summary = diagnosticResults.steps.some(s => s.status === 'error')
      ? 'いくつかの問題が見つかりました。詳細をご確認ください。'
      : 'すべてのチェックが正常に完了しました。';
      
    setDiagnosticResults(prev => ({
      ...prev,
      running: false,
      completed: true,
      summary
    }));
  };

  // 診断ステップを追加する
  const addStep = async (message, status) => {
    // UIの応答性を確保するために少し遅延させる
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setDiagnosticResults(prev => ({
      ...prev,
      steps: [...prev.steps, { message, status, timestamp: new Date().toLocaleTimeString() }]
    }));

    return true;
  };

  return (
    <div className="sound-debug-page">
      <style jsx>{`
        .sound-debug-page {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }
        .page-header {
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .tab-bar {
          display: flex;
          margin-bottom: 20px;
        }
        .tab {
          padding: 10px 15px;
          background: #f0f0f0;
          border: none;
          cursor: pointer;
          margin-right: 5px;
          border-radius: 4px 4px 0 0;
        }
        .tab.active {
          background: #007bff;
          color: white;
        }
        .tab-content {
          background: #fff;
          padding: 20px;
          border-radius: 0 4px 4px 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .diagnostic-panel {
          margin-top: 20px;
        }
        .run-button {
          padding: 10px 15px;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .run-button:disabled {
          background-color: #cccccc;
        }
        .diagnostic-log {
          margin-top: 15px;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
          max-height: 300px;
          overflow-y: auto;
          background-color: #f8f9fa;
          font-family: monospace;
        }
        .log-entry {
          padding: 5px 0;
          border-bottom: 1px solid #eee;
        }
        .log-entry:last-child {
          border-bottom: none;
        }
        .log-running { color: #6c757d; }
        .log-success { color: #28a745; }
        .log-error { color: #dc3545; }
        .log-info { color: #17a2b8; }
        .log-timestamp {
          font-size: 0.8em;
          color: #6c757d;
          margin-right: 10px;
        }
        .summary {
          margin-top: 15px;
          padding: 10px;
          background-color: #e9ecef;
          border-radius: 4px;
          font-weight: bold;
        }
      `}</style>
      
      <div className="page-header">
        <h1>サウンドシステム診断</h1>
        <p>タイピングゲームのサウンド問題を診断・デバッグするためのページです</p>
      </div>
      
      <div className="tab-bar">
        <button 
          className={`tab ${activeTab === 'diagnose' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnose')}
        >
          診断
        </button>
        <button 
          className={`tab ${activeTab === 'debug' ? 'active' : ''}`}
          onClick={() => setActiveTab('debug')}
        >
          詳細デバッグ
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'diagnose' ? (
          <div className="diagnostic-panel">
            <h2>サウンドシステム診断</h2>
            <p>サウンドに関する問題を自動診断します。「診断を実行」ボタンをクリックしてください。</p>
            
            <button 
              className="run-button" 
              onClick={runDiagnostic}
              disabled={diagnosticResults.running}
            >
              {diagnosticResults.running ? '診断中...' : '診断を実行'}
            </button>
            
            {(diagnosticResults.steps.length > 0) && (
              <div className="diagnostic-log">
                {diagnosticResults.steps.map((step, index) => (
                  <div key={index} className={`log-entry log-${step.status}`}>
                    {step.timestamp && <span className="log-timestamp">[{step.timestamp}]</span>}
                    {step.message}
                  </div>
                ))}
              </div>
            )}
            
            {diagnosticResults.completed && (
              <div className="summary">
                診断結果: {diagnosticResults.summary}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2>詳細デバッグパネル</h2>
            <SoundDebugPanel />
          </div>
        )}
      </div>
    </div>
  );
}