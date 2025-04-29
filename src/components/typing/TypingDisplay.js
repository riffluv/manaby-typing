import React, { memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * タイピングテキスト表示コンポーネント
 * タイピングゲームの問題文、入力済みテキスト、現在の入力を表示する
 *
 * @param {Object} props
 * @param {string} props.displayRomaji - 表示するローマ字テキスト
 * @param {Object} props.coloringInfo - 色分け情報
 * @param {boolean} props.isCompleted - タイピング完了フラグ
 * @param {string} props.currentInput - ユーザーの現在の入力
 * @param {boolean} props.errorAnimation - エラーアニメーションフラグ
 */
const TypingDisplay = ({
  displayRomaji,
  coloringInfo,
  isCompleted,
  currentInput = '',
  errorAnimation = false,
}) => {
  // パフォーマンス向上のためコンソール出力を開発環境のみに制限
  if (process.env.NODE_ENV === 'development') {
    console.debug('[TypingDisplay] レンダリング:', {
      displayRomajiLength: displayRomaji?.length,
      isCompleted,
    });
  }

  if (!displayRomaji) return null;

  // 完了状態の場合
  if (isCompleted) {
    return (
      <div className={styles.typingRomaji}>
        <span className={styles.completed}>{displayRomaji}</span>
      </div>
    );
  }

  // 現在の入力状態を取得
  const typedIndex = coloringInfo?.typedLength || 0;
  const currentPosition = coloringInfo?.currentPosition || 0;
  
  // 各部分の文字列を取得
  // 1. すでに入力済みの部分（緑色で表示）
  const typed = displayRomaji.substring(0, typedIndex);
  
  // 2. 現在入力中の文字（入力中の文字も緑色で表示）
  const current = displayRomaji.substring(typedIndex, currentPosition + (currentInput?.length || 0));
  
  // 3. 残りの未入力部分
  const remaining = displayRomaji.substring(currentPosition + (currentInput?.length || 0));

  return (
    <div className={styles.typingRomaji} data-testid="typing-display">
      {/* 入力済みの部分（緑色） */}
      <span className={styles.completed}>{typed}</span>
      
      {/* 現在入力中の文字も緑色にする - 1文字目から緑にする */}
      {current && <span className={styles.completed}>{current}</span>}
      
      {/* 残り（未入力）部分 - エラー時は赤色 */}
      <span className={errorAnimation ? styles.error : ''}>{remaining}</span>
    </div>
  );
};

// カスタム比較関数: プロップが実質的に変わった場合のみ再レンダリング
const arePropsEqual = (prevProps, nextProps) => {
  // 完了状態が変わった場合は更新
  if (prevProps.isCompleted !== nextProps.isCompleted) return false;

  // エラーアニメーション状態が変わった場合は更新
  if (prevProps.errorAnimation !== nextProps.errorAnimation) return false;

  // displayRomaji が変わった場合は更新
  if (prevProps.displayRomaji !== nextProps.displayRomaji) return false;

  // currentInput が変わった場合は更新
  if (prevProps.currentInput !== nextProps.currentInput) return false;

  // coloringInfo の重要な部分だけを比較
  if (
    prevProps.coloringInfo?.typedLength !== nextProps.coloringInfo?.typedLength
  )
    return false;
  if (
    prevProps.coloringInfo?.currentPosition !==
    nextProps.coloringInfo?.currentPosition
  )
    return false;

  // それ以外は再レンダリングしない
  return true;
};

// React.memo でコンポーネントをラップし、カスタム比較関数を使用
export default memo(TypingDisplay, arePropsEqual);
