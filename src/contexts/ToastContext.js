'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Toast from '../components/common/Toast';

// トースト通知のコンテキストを作成
const ToastContext = createContext();

/**
 * トースト通知プロバイダーコンポーネント
 * アプリ全体でトースト通知を管理します
 */
export const ToastProvider = ({ children }) => {
  // 複数のトースト通知を管理するための状態
  const [toasts, setToasts] = useState([]);

  // トースト通知を追加する関数
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = uuidv4(); // ユニークなIDを生成
    const newToast = {
      id,
      message,
      type,
      duration,
      visible: true,
    };

    setToasts((prevToasts) => [...prevToasts, newToast]);
    return id; // 後で特定のトーストを閉じる場合に使用できるIDを返す
  }, []);

  // 成功トースト表示のショートカット関数
  const showSuccess = useCallback((message, duration = 3000) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  // エラートースト表示のショートカット関数
  const showError = useCallback((message, duration = 3000) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  // 警告トースト表示のショートカット関数
  const showWarning = useCallback((message, duration = 3000) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  // 情報トースト表示のショートカット関数
  const showInfo = useCallback((message, duration = 3000) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  // トースト通知を閉じる関数
  const removeToast = useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // 特定のトーストを閉じる前に非表示にする関数（アニメーション用）
  const closeToast = useCallback((id) => {
    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, visible: false } : toast
      )
    );
    
    // アニメーション用に少し待ってから完全に削除
    setTimeout(() => {
      removeToast(id);
    }, 300);
  }, [removeToast]);

  // すべてのトースト通知をクリアする関数
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        addToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        closeToast,
        clearAllToasts,
      }}
    >
      {children}
      
      {/* トースト通知の表示エリア */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            visible={toast.visible}
            duration={toast.duration}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// トーストコンテキストを使用するためのカスタムフック
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastContext;