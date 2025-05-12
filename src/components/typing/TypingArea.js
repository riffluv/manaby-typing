'use client';

/**
 * TypingArea.js
 * 最適化版タイピングエリアコンポーネント
 * 責任: タイピング入力表示とキーボード表示
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import ProblemDisplay from './ProblemDisplay';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import RetroKeyboard from './RetroKeyboard';
import styles from '../../styles/typing/TypingArea.module.css';

/**
 * 最適化版タイピングエリアコンポーネント（リファクタリング・安定化版 2025年5月12日）
 * 副作用を減らし、パフォーマンスを最適化
 * さらにエラーハンドリングを強化し安定性を向上
 */
const TypingArea = ({
  typing,
  currentProblem,
  lastPressedKey = '',
  className = '',
}) => {
  // デバッグモード設定（必要に応じて有効化）
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // デバッグログ関数
  const debugLog = (message, ...args) => {
    if (DEBUG_MODE) console.log(`[TypingArea] ${message}`, ...args);
  };

  // タイピング表示用の状態（初期値にエラー状態フラグを追加）
  const [displayData, setDisplayData] = useState({
    romaji: '',
    typedLength: 0,
    currentCharIndex: 0,
    hasError: false,
    lastUpdated: Date.now()
  });

  // 次に入力すべきキーを取得（安全性強化）
  const nextKey = useMemo(() => {
    // typingオブジェクトの存在確認
    if (!typing) {
      return '';
    }

    // getNextKey関数が存在するか確認
    if (typeof typing.getNextKey !== 'function') {
      if (DEBUG_MODE) console.warn('[TypingArea] getNextKey関数が見つかりません');
      return '';
    }

    // 関数呼び出しをtry-catchで保護
    try {
      const key = typing.getNextKey() || '';
      debugLog('次のキー:', key);
      return key;
    } catch (error) {
      console.error('[TypingArea] 次のキー取得エラー:', error);
      return '';
    }
  }, [typing, DEBUG_MODE, typing?.displayInfo?.currentCharIndex, typing?.displayInfo?.typedLength]);
  // 表示データの更新（キャラクターインデックスが変わったときに更新）（安全性強化版）
  useEffect(() => {
    // typing存在チェック
    if (!typing) {
      debugLog('typingオブジェクトがありません');
      return;
    }

    // displayInfo存在チェック
    if (!typing.displayInfo) {
      debugLog('表示情報が見つかりません');
      return;
    }

    try {
      // displayInfoのプロパティを安全に展開（デフォルト値付き）
      const {
        romaji = '',
        typedLength = 0,
        currentCharIndex = 0,
        currentInput = '',
        currentCharRomaji = '',
        expectedNextChar = ''
      } = typing.displayInfo;

      // ローマ字データの有効性確認
      const hasValidRomaji = typeof romaji === 'string';

      // デバッグ出力（条件付き）
      debugLog('表示データ更新:', {
        romaji: hasValidRomaji ?
          (romaji.substring(0, 20) + (romaji.length > 20 ? '...' : '')) :
          '<無効>',
        typedLength,
        currentCharIndex,
        currentInput,
        expectedNextChar,
        valid: hasValidRomaji
      }); setDisplayData({
        romaji: romaji || '',
        typedLength: typedLength || 0,
        currentCharIndex: currentCharIndex || 0,
        currentInput: currentInput || '',
        currentCharRomaji: currentCharRomaji || '',
        expectedNextChar: expectedNextChar || '',
        hasError: false,
        lastUpdated: Date.now()
      });
    } catch (error) {
      // エラー発生時の処理
      console.error('[TypingArea] 表示データ更新エラー:', error);

      // エラー状態を設定
      setDisplayData(prevData => ({
        ...prevData,
        hasError: true,
        errorMessage: error.message,
        lastUpdated: Date.now()
      }));
    }
  }, [
    typing?.displayInfo?.romaji,
    typing?.displayInfo?.typedLength,
    typing?.displayInfo?.currentCharIndex,
    typing?.displayInfo?.currentInput,
    typing?.displayInfo?.currentCharRomaji,
    typing?.displayInfo?.expectedNextChar
  ]);  // キーボード関連のアニメーションを削除

  // typingオブジェクトが存在しない場合のフォールバック
  if (!typing) {
    debugLog('typingオブジェクトがありません');
    return (
      <div className={`${styles.typing_area} ${className || ''}`}>
        <div className={styles.typing_loading}>読み込み中...</div>
      </div>
    );
  }

  // currentProblemが存在するか検証
  if (!currentProblem) {
    debugLog('問題データがありません');
    return (
      <div className={`${styles.typing_area} ${className || ''}`}>
        <div className={styles.typing_loading}>問題を読み込み中...</div>
      </div>
    );
  }

  // 問題データの詳細ログ出力（デバッグ用、条件付き）
  if (DEBUG_MODE) {
    try {
      debugLog('レンダリング中の問題データ:', {
        displayText: currentProblem?.displayText,
        displayTextLength: currentProblem?.displayText?.length,
        kanaText: currentProblem?.kanaText?.substring(0, 20) + (currentProblem?.kanaText?.length > 20 ? '...' : ''),
        typing_sessionあり: typing?.typingSession ? 'あり' : 'なし',
        typing_session問題: typing?.typingSession?.problem?.displayText,
        typing_session問題_length: typing?.typingSession?.problem?.displayText?.length,
        一致: currentProblem?.displayText === typing?.typingSession?.problem?.displayText,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('[TypingArea] 問題データログ出力エラー:', error);
    }
  }
  // エラー状態表示用のクラス名計算（安全化）
  const errorClass = typing?.errorAnimation ? styles.typing_area__problem_error : '';

  // 表示用データの安全な取得
  const safeDisplayData = {
    romaji: displayData.romaji || '',
    typedLength: displayData.typedLength || 0,
    currentCharIndex: displayData.currentCharIndex || 0,
    expectedNextChar: displayData.expectedNextChar || '',
    currentInput: displayData.currentInput || typing?.displayInfo?.currentInput || '',
    currentCharRomaji: displayData.currentCharRomaji || typing?.displayInfo?.currentCharRomaji || ''
  };

  // エラー状態の検出
  const hasErrors = displayData.hasError || typing?.errorAnimation;  return (
    <div className={`${styles.typing_area} ${className || ''}`}>
      {/* 問題表示エリア */}
      <div
        className={styles.typing_area__problem}
        data-error={hasErrors ? 'true' : 'false'}
      >
        <ProblemDisplay
          // 問題テキストのみをキーにして、必要な時だけ再レンダリングされるようにする
          key={`problem-${currentProblem?.displayText || 'default'}`}
          text={currentProblem?.displayText || '表示するお題がありません'}
          animate={false}
          className={errorClass}
        />
        <SimpleTypingDisplay
          romaji={safeDisplayData.romaji}
          typedLength={safeDisplayData.typedLength}
          nextChar={safeDisplayData.expectedNextChar || nextKey}
          isError={hasErrors}
          className={styles.typing_area__romaji}
          currentInput={safeDisplayData.currentInput}
          currentCharRomaji={safeDisplayData.currentCharRomaji}
          inputMode={displayData.currentInput ? 'consonant' : 'normal'}
        />      </div>

      {/* レトロなSF風キーボード */}
      <div className={styles.typing_area__keyboard_container}>
        <RetroKeyboard
          nextKey={safeDisplayData.expectedNextChar || nextKey}
          lastPressedKey={lastPressedKey}
        />
      </div>
    </div>
  );
};

export default TypingArea;
