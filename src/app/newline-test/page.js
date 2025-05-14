'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function NewlineTestPage({ searchParams }) {
  const [text, setText] = useState('');
  const [processed, setProcessed] = useState('');

  useEffect(() => {
    // URLパラメータからテキストを取得
    const urlText = searchParams?.text || 'Default\nText\nWith\nNewlines';
    setText(urlText);

    // テキスト処理
    const processedText = urlText
      .split('\n')
      .map((line) => `>> ${line}`)
      .join('\n');

    setProcessed(processedText);
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <h1>改行テスト</h1>

      <div className={styles.textSection}>
        <h2>元のテキスト:</h2>
        <pre className={styles.textDisplay}>{text}</pre>
      </div>

      <div className={styles.textSection}>
        <h2>処理後のテキスト:</h2>
        <pre className={styles.processedText}>{processed}</pre>
      </div>

      <div className={styles.info}>
        <p>このページは動的レンダリングを使用しています。</p>
        <p>
          <code>?text=テスト1%0Aテスト2</code>{' '}
          のようにURLパラメータを使って異なるテキストをテストできます。
        </p>
        <p>%0A は改行コードです。</p>
      </div>
    </div>
  );
}
