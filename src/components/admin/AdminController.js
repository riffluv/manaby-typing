'use client';

import React, { useState, useEffect } from 'react';
import AdminPopup from './AdminPopup';

/**
 * 管理者モードのコントローラーコンポーネント
 * Ctrl + @ キーの組み合わせを監視し、管理者モーダルの表示を制御します
 * 
 * @param {Object} props コンポーネントのプロパティ
 * @param {React.MutableRefObject} props.backgroundRef 背景コンポーネントへの参照
 */
const AdminController = ({ backgroundRef }) => {
  // モーダルの表示状態を管理
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // コンポーネントマウント時に現在の管理者状態を確認
  useEffect(() => {
    // localStorageから管理者状態を読み込む
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    console.log('[管理者モード] 現在の状態:', isAdmin ? '有効' : '無効');
  }, []);

  // キーボードショートカットのイベントハンドラー
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + @ (キーコード64) の組み合わせを検出
      // e.key が '@' の場合もチェック (一部のキーボードレイアウト対応)
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 64 || e.key === '@')) {
        e.preventDefault(); // デフォルトの動作をキャンセル
        console.log('[管理者モード] Ctrl + @ キーが検出されました');

        // 管理者モードを有効化
        localStorage.setItem('isAdmin', 'true');
        console.log('[管理者モード] 有効化されました');

        setIsAdminModalOpen(true); // 管理者モーダルを表示
      }
    };

    // イベントリスナーを登録
    window.addEventListener('keydown', handleKeyDown);

    // コンポーネントのクリーンアップ時にイベントリスナーを削除
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 管理者モーダルを閉じる処理
  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
    console.log('[管理者モード] モーダルを閉じました');
  };

  return (
    <>
      {/* 管理者設定モーダル - 背景への参照を渡す */}
      <AdminPopup 
        isOpen={isAdminModalOpen} 
        onClose={closeAdminModal} 
        backgroundRef={backgroundRef}
      />
    </>
  );
};

export default AdminController;
