'use client';

import { MCPStatusDisplay } from '../../utils/MCPUtils';

/**
 * MCPステータス表示用のラッパーコンポーネント
 * クライアント側でのみレンダリングされる
 */
export default function MCPStatusWrapper({ position = 'bottom-right' }) {
  return <MCPStatusDisplay position={position} />;
}