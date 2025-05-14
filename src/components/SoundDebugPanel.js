'use client';

import { useState, useEffect } from 'react';
import { getStaticPath } from '@/utils/StaticPathUtils';
import SoundUtils from '@/utils/SoundUtils';

/**
 * サウンドデバッグパネルコンポーネント
 * サウンドファイルのロードと再生テストを行います
 */
export default function SoundDebugPanel() {
  const [soundStatus, setSoundStatus] = useState({
    initialized: false,
    message: '初期化中...',
    soundFiles: []
  });

  // テスト対象のサウンドファイル
  const soundFiles = [
    { id: 'hit05', path: '/sounds/hit05-1.mp3', description: 'タイピング正解音' },
    { id: 'hit04', path: '/sounds/hit04-1.mp3', description: 'タイピングエラー音' },
    { id: 'button', path: '/sounds/buttonsound1.mp3', description: 'ボタン音' },
    { id: 'result', path: '/sounds/resultsound.mp3', description: '結果表示音' }
  ];

  // サウンドシステムのインスタンス
  const [soundSystem, setSoundSystem] = useState(null);

  // 初期化処理
  useEffect(() => {
    async function initSoundSystem() {
      try {
        // サウンドシステムの初期化
        const sound = new SoundUtils();
        await sound.init();
        setSoundSystem(sound);

        // サウンドファイルのステータスを取得
        const fileStatuses = await Promise.all(
          soundFiles.map(async file => {
            try {
              const resolvedPath = getStaticPath(file.path);
              const loadStartTime = Date.now();
              const buffer = await sound.loadSound(resolvedPath);
              const loadTime = Date.now() - loadStartTime;
              
              return {
                ...file,
                resolvedPath,
                loaded: buffer !== null,
                loadTime: `${loadTime}ms`,
                error: null
              };
            } catch (err) {
              return {
                ...file,
                resolvedPath: getStaticPath(file.path),
                loaded: false,
                error: err.message
              };
            }
          })
        );

        setSoundStatus({
          initialized: true,
          message: 'サウンドシステム初期化完了',
          soundFiles: fileStatuses
        });
      } catch (err) {
        setSoundStatus({
          initialized: false,
          message: `初期化エラー: ${err.message}`,
          soundFiles: []
        });
      }
    }

    initSoundSystem();
  }, []);

  // サウンドを再生する関数
  const playSound = async (path) => {
    if (!soundSystem) return;
    
    try {
      await soundSystem.playSound(path);
    } catch (err) {
      console.error('サウンド再生エラー:', err);
    }
  };

  // GitHub Pages環境かどうかを判定
  const isGitHubPages = typeof window !== 'undefined' && 
    window.location && window.location.hostname.includes('github.io');

  return (
    <div className="sound-debug-panel">
      <style jsx>{`
        .sound-debug-panel {
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
        .status-box {
          padding: 10px;
          background: ${soundStatus.initialized ? '#e6f7e6' : '#fff0f0'};
          border: 1px solid ${soundStatus.initialized ? '#c3e6cb' : '#f5c6cb'};
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .sound-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .sound-table th,
        .sound-table td {
          padding: 8px;
          text-align: left;
          border: 1px solid #ddd;
        }
        .sound-table th {
          background-color: #f2f2f2;
        }
        .play-button {
          padding: 5px 10px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .play-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        .error-text {
          color: #dc3545;
          font-size: 0.9em;
        }
        .success-text {
          color: #28a745;
        }
        .env-info {
          margin-top: 20px;
          padding: 10px;
          background: #f0f8ff;
          border: 1px solid #b8daff;
          border-radius: 4px;
          font-size: 0.9em;
        }
      `}</style>
      
      <h2>サウンドデバッグパネル</h2>
      
      <div className="status-box">
        <p><strong>ステータス:</strong> {soundStatus.message}</p>
        <p><strong>初期化:</strong> {soundStatus.initialized ? 
          <span className="success-text">成功</span> : 
          <span className="error-text">未完了</span>
        }</p>
      </div>
      
      <h3>サウンドファイルテスト</h3>
      
      {soundStatus.soundFiles.length === 0 ? (
        <p>ロード中...</p>
      ) : (
        <table className="sound-table">
          <thead>
            <tr>
              <th>説明</th>
              <th>パス</th>
              <th>ステータス</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {soundStatus.soundFiles.map((file, index) => (
              <tr key={index}>
                <td>{file.description}</td>
                <td>
                  <div>{file.path}</div>
                  <small>解決パス: {file.resolvedPath}</small>
                </td>
                <td>
                  {file.loaded ? (
                    <span className="success-text">
                      ロード成功
                      {file.loadTime && <span>（{file.loadTime}）</span>}
                    </span>
                  ) : (
                    <span className="error-text">
                      失敗
                      {file.error && <div><small>{file.error}</small></div>}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    className="play-button"
                    onClick={() => playSound(file.resolvedPath)}
                    disabled={!file.loaded}
                  >
                    再生
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <div className="env-info">
        <h3>環境情報</h3>
        <p><strong>GitHub Pages環境:</strong> {isGitHubPages ? 'はい' : 'いいえ'}</p>
        <p><strong>BASE_PATH:</strong> {process.env.NEXT_PUBLIC_BASE_PATH || '（未設定）'}</p>
        <p><strong>環境:</strong> {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
}