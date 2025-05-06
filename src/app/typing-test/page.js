'use client';

import { useState, useEffect } from 'react';
import SimpleTypingTester from '../../components/typing/SimpleTypingTester';

export default function TypingTestPage() {
  const [mounted, setMounted] = useState(false);

  // クライアント側でのみレンダリングを行うようにする
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '2rem',
        color: '#ff9a28'
      }}>
        タイピング表示テストページ
      </h1>

      <SimpleTypingTester />

      <div style={{
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <a
          href="/"
          style={{
            color: '#ff9a28',
            textDecoration: 'underline'
          }}
        >
          トップページに戻る
        </a>
      </div>
    </div>
  );
}