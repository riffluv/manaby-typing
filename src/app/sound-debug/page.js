'use client';

import { useState, useEffect } from 'react';
import { getStaticPath } from '@/utils/StaticPathUtils';
import SoundUtils from '@/utils/SoundUtils';

/**
 * サウンドデバッグ用ページ
 * GitHubページで静的生成に対応するため、searchParamsは使用しない
 */
export default function SoundDebugPage() {
  const [soundInfo, setSoundInfo] = useState({
    initialized: false,
    status: '初期化中...',
    testResults: []
  });
  
  // テストサウンドファイルのリスト
  const testSounds = [
    { id: 'typing-correct', path: '/sounds/hit05-1.mp3', description: 'タイピング正解音' },
    { id: 'typing-error', path: '/sounds/hit04-1.mp3', description: 'タイピングエラー音' }
  ];

  // サウンドユーティリティの初期化とテスト
  useEffect(() => {
    async function initAndTestSounds() {
      try {
        // サウンドシステムの初期化
        const sound = new SoundUtils();
        await sound.init();
        
        // サウンドファイルをテスト
        const results = [];
        
        for (const testSound of testSounds) {
          try {
            // パス解決のテスト
            const resolvedPath = getStaticPath(testSound.path);
            
            // サウンドをロードしてテスト再生
            const buffer = await sound.loadSound(resolvedPath);
            const canPlay = buffer !== null;
            
            results.push({
              id: testSound.id,
              path: testSound.path,
              resolvedPath,
              success: canPlay,
              description: testSound.description
            });
            
            // テスト再生
            if (canPlay) {
              await sound.playSound(resolvedPath);
            }
          } catch (err) {
            results.push({
              id: testSound.id,
              path: testSound.path,
              resolvedPath: getStaticPath(testSound.path),
              success: false,
              error: err.message,
              description: testSound.description
            });
          }
        }
        
        setSoundInfo({
          initialized: true,
          status: '初期化完了',
          testResults: results
        });
      } catch (err) {
        setSoundInfo({
          initialized: false,
          status: `エラー: ${err.message}`,
          testResults: []
        });
      }
    }
    
    initAndTestSounds();
  }, []);

  // サウンドを再生するハンドラ
  const handlePlaySound = async (path) => {
    try {
      const sound = new SoundUtils();
      await sound.init();
      await sound.playSound(path);
    } catch (err) {
      console.error('サウンド再生エラー:', err);
      alert(`サウンド再生に失敗しました: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>サウンドデバッグページ</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>サウンドシステム状態</h2>
        <p><strong>ステータス:</strong> {soundInfo.status}</p>
        <p><strong>初期化:</strong> {soundInfo.initialized ? '成功' : '未完了'}</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>サウンドファイルテスト結果</h2>
        {soundInfo.testResults.length === 0 ? (
          <p>テスト結果を読み込み中...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>説明</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>パス</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>解決されたパス</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>ステータス</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>アクション</th>
              </tr>
            </thead>
            <tbody>
              {soundInfo.testResults.map((result, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.description}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.path}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{result.resolvedPath}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    {result.success ? 
                      <span style={{ color: 'green' }}>成功</span> : 
                      <span style={{ color: 'red' }}>
                        失敗{result.error ? `: ${result.error}` : ''}
                      </span>
                    }
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <button 
                      onClick={() => handlePlaySound(result.resolvedPath)}
                      disabled={!result.success}
                      style={{ 
                        padding: '4px 8px',
                        backgroundColor: result.success ? '#4CAF50' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: result.success ? 'pointer' : 'not-allowed'
                      }}
                    >
                      再生
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>環境情報</h2>
        <p><strong>ホスト名:</strong> {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
        <p><strong>BasePath:</strong> {process.env.NEXT_PUBLIC_BASE_PATH || '未設定'}</p>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>ブラウザ:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
      </div>
    </div>
  );
}