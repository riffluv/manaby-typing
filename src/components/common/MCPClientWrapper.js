'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// MCPInitializerを動的にインポート（サーバーサイドレンダリング時にエラーが出ないようにするため）
const MCPInitializer = dynamic(
  () => import('../../utils/MCPInitializer'),
  { ssr: false }
);

/**
 * MCPInitializerのクライアントラッパーコンポーネント
 * サーバーコンポーネントからクライアントコンポーネントを使用するためのラッパー
 */
export default function MCPClientWrapper() {
  const [isBrowser, setIsBrowser] = useState(false);

  // コンポーネントがマウントされたときにだけレンダリングする（クライアントサイドのみ）
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // サーバーサイドではレンダリングしない
  if (!isBrowser) {
    return null;
  }

  // クライアントサイドのみでMCPInitializerをレンダリング
  return <MCPInitializer />;
}