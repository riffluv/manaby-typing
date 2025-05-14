'use client';

/**
 * useImageOptimizer.js
 * 画像読み込みとレンダリングを最適化するためのフック
 */
import { useState, useEffect } from 'react';

/**
 * 画像の遅延ロードを実装するフック
 * @param {string} src - 画像のパス
 * @param {string} placeholderSrc - プレースホルダー画像のパス
 * @param {Object} options - オプション設定
 * @returns {Object} 最適化された画像属性
 */
export function useOptimizedImage(src, placeholderSrc = null, options = {}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  
  const {
    rootMargin = '0px',
    threshold = 0.1,
    sizes = '100vw',
    eager = false, // 即時読み込みが必要な場合はtrue
  } = options;

  useEffect(() => {
    // 画面外の画像は読み込まない（eager=trueの場合は例外）
    if (eager) {
      setCurrentSrc(src);
      return;
    }

    if (!window.IntersectionObserver) {
      // IntersectionObserverが使用できない環境ではすぐに読み込む
      setCurrentSrc(src);
      return;
    }

    let observer;
    let element = document.createElement('img');
    
    const onLoad = () => {
      setLoaded(true);
      setCurrentSrc(src);
      cleanup();
    };
    
    const onError = () => {
      setError(true);
      cleanup();
    };
    
    const cleanup = () => {
      if (observer) {
        observer.disconnect();
      }
      if (element) {
        element.removeEventListener('load', onLoad);
        element.removeEventListener('error', onError);
        element = null;
      }
    };

    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        element.src = src;
        element.addEventListener('load', onLoad);
        element.addEventListener('error', onError);
      }
    }, {
      rootMargin,
      threshold
    });
    
    observer.observe(element);
    
    return cleanup;
  }, [src, eager, rootMargin, threshold]);

  // 画像の最適化属性を返す
  return {
    src: currentSrc,
    loading: eager ? 'eager' : 'lazy', // eager=trueの場合は優先読み込み
    onLoad: () => setLoaded(true),
    onError: () => setError(true),
    isLoaded: loaded,
    hasError: error,
    sizes,
    // srcSetを生成する場合は追加
  };
}

export default useOptimizedImage;
