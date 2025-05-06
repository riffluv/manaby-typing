/**
   * キーボード入力ハンドラ
   */
const handleKeyDown = useCallback((e) => {
  if (!isFocused) return;

  // スペースキーのデフォルト動作を防止
  if (e.key === ' ') {
    e.preventDefault();
  }

  // Tabキーを無効化（フォーカス移動防止）
  if (e.key === 'Tab') {
    e.preventDefault();
    return;
  }

  // ESCキーでメインメニューに戻る
  if (e.key === 'Escape') {
    e.preventDefault();
    soundSystem.playSound('button');
    setTimeout(() => navigateTo('menu'), 100);
    return;
  }

  // 文字入力でなければ無視
  if (e.key.length !== 1 && e.key !== 'Backspace') {
    return;
  }

  // タイピング処理は直接ローカルで実行（MCPから完全に分離）
  // これによりタイピングのレスポンスを最優先
  if (typingModelRef.current) {
    try {
      // 高速ローカル処理パス
      const result = typingModelRef.current.processLocalInput(e.key);

      // 正解音または不正解音を再生
      if (result && result.success) {
        soundSystem.playSound('success');
      } else if (result && !result.success) {
        soundSystem.playSound('miss');
      }
    } catch (error) {
      console.error('[MCPGameScreen] 入力処理エラー:', error);
    }
  }

  // MCPへの通知は非同期バックグラウンドで行い、
  // タイピングのレスポンスに影響しないようにする
  if (mcpContext.isActive) {
    // 処理を非同期化し、メインスレッドをブロックしない
    setTimeout(() => {
      mcpContext.recordTypingInput({
        key: e.key,
        isBackspace: e.key === 'Backspace',
        timestamp: Date.now(),
        isAnalyticsOnly: true  // 分析目的のみであることを明示
      });
    }, 0);
  }
}, [isFocused, mcpContext, soundSystem, navigateTo]);

/**
 * 表示情報更新ハンドラ
 */
const handleDisplayUpdate = useCallback((data) => {
  const { displayInfo } = data || {};
  if (displayInfo) {
    // 状態更新を最適化（必要な部分のみ更新）
    setDisplayInfo(prevInfo => {
      // 必要な場合のみ再レンダリングを実行
      if (JSON.stringify(prevInfo) === JSON.stringify(displayInfo)) {
        return prevInfo; // 変更なしの場合は前の状態を返して再レンダリングを抑制
      }
      return displayInfo;
    });

    // 完了状態の場合
    if (displayInfo.isCompleted && !displayInfo.isProcessingComplete) {
      // 完了処理中フラグを設定し、二重処理を防止
      setDisplayInfo(prev => ({ ...prev, isProcessingComplete: true }));

      // 音を再生
      soundSystem.playSound('success');

      // 完了コマンドを送信（パフォーマンス改善のため遅延実行）
      if (typingModelRef.current) {
        // 少し遅延してからコマンドを実行（UIレスポンスを優先）
        setTimeout(() => {
          window._mcp?.send(TypingCommands.COMPLETE_PROBLEM);

          // 完了イベントを監視して問題完了処理を実行
          const completedListener = (completedData) => {
            handleProblemComplete({
              problem: problem,
              stats: completedData.stats
            });

            // リスナーを削除（メモリリーク防止）
            window._mcp?.off(TypingEvents.PROBLEM_COMPLETED, completedListener);
          };

          // 完了イベントリスナーを登録
          window._mcp?.on(TypingEvents.PROBLEM_COMPLETED, completedListener);
        }, 300);
      }
    }

    // エラー状態の場合（サウンド効果）
    if (displayInfo.isError) {
      // 効果音を再生（一度だけ）
      soundSystem.playSound('miss');
    }
  }
}, [problem, soundSystem, handleProblemComplete]);