'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import FancyKeyboard from '../../../components/typing/FancyKeyboard';

export default function FancyKeyboardDemo({ searchParams }) {
  const [nextKey, setNextKey] = useState('a');
  const [lastPressedKey, setLastPressedKey] = useState('');
  const [isError, setIsError] = useState(false);

  // searchParamsを使用して初期設定を変更できるようにする
  useEffect(() => {
    if (searchParams && searchParams.key) {
      setNextKey(searchParams.key.charAt(0).toLowerCase());
    }
  }, [searchParams]);

  // キーボードイベントのリスナー
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      setLastPressedKey(key);

      if (key === nextKey) {
        setIsError(false);
        // 次のランダムな文字を設定
        const charCode = Math.floor(Math.random() * 26) + 97;
        setNextKey(String.fromCharCode(charCode));
      } else {
        setIsError(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextKey]);

  return (
    <div className={styles.container}>
      <h1>ファンシーキーボードデモ</h1>
      <p>
        次のキーを押してください: <strong>{nextKey.toUpperCase()}</strong>
      </p>
      {isError && <p className={styles.error}>間違いました！</p>}

      <div className={styles.keyboardContainer}>
        <FancyKeyboard
          nextKey={nextKey}
          lastPressedKey={lastPressedKey}
          isError={isError}
          className={styles.keyboard}
        />
      </div>

      <div className={styles.instructions}>
        <h2>使い方</h2>
        <p>ハイライトされたキーを押して、アニメーションを確認してください。</p>
        <p>間違ったキーを押すとエラーエフェクトが表示されます。</p>
      </div>
    </div>
  );
}
