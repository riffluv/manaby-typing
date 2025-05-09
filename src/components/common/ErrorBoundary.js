'use client';

import React, { Component } from 'react';
import styles from '../../styles/common/ErrorBoundary.module.css';
import Button from './Button';
import { useGameContext, SCREENS } from '../../contexts/GameContext';

/**
 * エラー境界コンポーネント
 * 子コンポーネントでのエラーを捕捉し、フォールバックUIを表示します
 */
export class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // 子コンポーネントでエラーが発生した場合に呼ばれる
  static getDerivedStateFromError(error) {
    // エラー状態を更新
    return { hasError: true };
  }

  // エラー情報を詳細に記録
  componentDidCatch(error, errorInfo) {
    // エラーとスタックトレースを状態に保存
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // エラーログを出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error('エラー境界がエラーを捕捉しました:', error);
      console.error('エラー情報:', errorInfo);
    }

    // エラートラッキングサービスに送信（必要に応じて実装）
    // sendErrorToTrackingService(error, errorInfo);
  }

  // エラー状態をリセット
  resetErrorState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    // エラーが発生した場合はフォールバックUIを表示
    if (this.state.hasError) {
      return this.props.fallback ? (
        this.props.fallback({
          error: this.state.error,
          resetError: this.resetErrorState,
        })
      ) : (
        <div className={styles.error_boundary}>
          <div className={styles.error_container}>
            <h2 className={styles.error_title}>予期せぬエラーが発生しました</h2>
            <p className={styles.error_message}>
              申し訳ありません。プログラムの実行中に問題が発生しました。
            </p>
            <div className={styles.error_actions}>
              <Button onClick={this.resetErrorState} variant="primary">
                再試行
              </Button>

              {this.props.onReturnToMenu && (
                <Button onClick={this.props.onReturnToMenu} variant="secondary">
                  メニューに戻る
                </Button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className={styles.error_details}>
                <summary>エラー詳細 (開発環境のみ)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <pre>
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // エラーがない場合は子コンポーネントをそのまま表示
    return this.props.children;
  }
}

/**
 * エラー境界コンポーネントのラッパー
 * コンテキストにアクセスするためのHook対応
 */
export default function ErrorBoundary({ children, fallback }) {
  const { goToScreen } = useGameContext();

  const handleReturnToMenu = () => {
    goToScreen(SCREENS.MAIN_MENU);
  };

  return (
    <ErrorBoundaryClass fallback={fallback} onReturnToMenu={handleReturnToMenu}>
      {children}
    </ErrorBoundaryClass>
  );
}
