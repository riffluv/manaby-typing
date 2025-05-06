import React, { useState, useEffect } from 'react';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import { TypingEvents } from '../../utils/mcp/TypingProtocol';
import MCPUtils from '../../utils/MCPUtils';

/**
 * MCPアーキテクチャを活用したタイピング表示コンポーネント
 * SimpleTypingDisplayをラップし、MCPからの状態を自動的に受け取る
 * 
 * @param {Object} props コンポーネントのプロパティ
 * @returns {JSX.Element} タイピング表示コンポーネント
 */
const MCPSimpleTypingDisplay = ({ className = '' }) => {
  // MCP接続状態の確認
  const [mcpAvailable, setMcpAvailable] = useState(false);
  
  // 表示状態
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    nextChar: '',
    isError: false,
    isCompleted: false,
    inputMode: 'normal',
    currentInput: '',
    currentCharRomaji: ''
  });

  // 初期化と利用可能かどうかのチェック
  useEffect(() => {
    // MCPの利用可能性をチェック（エラーハンドリングを追加）
    try {
      const available = typeof window !== 'undefined' && window._mcp;
      setMcpAvailable(available);
      
      if (available) {
        console.log('[MCPSimpleTypingDisplay] MCPが利用可能です');
      } else {
        console.warn('[MCPSimpleTypingDisplay] MCPが利用できません。従来の表示方式にフォールバックします。');
      }
    } catch (error) {
      console.error('[MCPSimpleTypingDisplay] MCP検出エラー:', error);
      setMcpAvailable(false);
    }
  }, []);

  // MCPイベントハンドラを登録
  useEffect(() => {
    // MCPが非アクティブならスキップ
    if (!mcpAvailable) return;
    
    try {
      // TypingEventsがインポートされていることを確認
      if (!TypingEvents || !TypingEvents.DISPLAY_UPDATED) {
        console.error('[MCPSimpleTypingDisplay] TypingEventsが正しく定義されていません');
        return;
      }
      
      // タイピングモデルのインスタンス取得（安全な方法で）
      // 直接importをやめて、動的にモジュールをロードする方法
      import('../../utils/mcp/TypingModelMCP').then(module => {
        const getTypingModelInstance = module.getTypingModelInstance;
        if (!getTypingModelInstance) {
          console.error('[MCPSimpleTypingDisplay] getTypingModelInstanceが見つかりません');
          return;
        }
        
        const typingModel = getTypingModelInstance();
        if (!typingModel) {
          console.error('[MCPSimpleTypingDisplay] タイピングモデルインスタンスの取得に失敗しました');
          return;
        }
        
        // 表示情報更新イベントのリスナー登録
        const unsubscribe = typingModel.addEventListener(
          TypingEvents.DISPLAY_UPDATED,
          (data) => {
            if (data && data.displayInfo) {
              setDisplayInfo(data.displayInfo);
            }
          }
        );
        
        return () => {
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
        };
      }).catch(error => {
        console.error('[MCPSimpleTypingDisplay] MCP動的ロードエラー:', error);
      });
      
    } catch (error) {
      console.error('[MCPSimpleTypingDisplay] MCP初期化エラー:', error);
    }
  }, [mcpAvailable]);

  // フォールバック表示（MCPがない場合はダミーデータ）
  if (!mcpAvailable) {
    return (
      <SimpleTypingDisplay 
        className={className}
        romaji="MCPが利用できないため、標準表示モードです。"
        typedLength={0}
        nextChar=""
        isError={false}
        inputMode="normal"
        currentInput=""
        currentCharRomaji=""
        isCompleted={false}
        isMCPBased={false}
      />
    );
  }

  // 既存のSimpleTypingDisplayをレンダリング
  return (
    <SimpleTypingDisplay
      className={className}
      romaji={displayInfo.romaji}
      typedLength={displayInfo.typedLength}
      nextChar={displayInfo.nextChar}
      isError={displayInfo.isError}
      inputMode={displayInfo.inputMode}
      currentInput={displayInfo.currentInput}
      currentCharRomaji={displayInfo.currentCharRomaji}
      isCompleted={displayInfo.isCompleted}
      isMCPBased={true}
    />
  );
};

export default MCPSimpleTypingDisplay;