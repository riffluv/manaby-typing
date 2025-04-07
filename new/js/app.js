/**
 * マナビー・タイピングゲーム - アプリケーション初期化
 * @charset UTF-8
 */

// アプリケーションのメインモジュール
if (!window.Manaby) window.Manaby = {};

// アプリモジュール
Manaby.App = (function() {
  console.log('アプリケーションモジュールを初期化しました');
  
  // DOMロード完了時の処理
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了、アプリケーション初期化開始');
    
    // 遅延実行を追加（フォールバック対策）
    setTimeout(function() {
      console.log('アプリケーション初期化完了');
    }, 1000);
  });
  
  // パブリックAPI
  return {
    // アプリ関連の関数をここに追加
  };
})(); 