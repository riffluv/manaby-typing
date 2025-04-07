/**
 * マナビー・タイピングゲーム - アプリケーション初期化
 * @charset UTF-8
 */

// マナビータイピング - アプリ初期化
// メインアプリの起動処理

// グローバルオブジェクト
if (!window.Manaby) window.Manaby = {};

// アプリの本体
Manaby.App = (function() {
  console.log('アプリ起動中...');
  
  // DOM読み込み後の処理
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM読み込み完了、初期化開始');
    
    // ちょっと待つ (読み込みタイミングの問題対策)
    setTimeout(function() {
      console.log('初期化完了！');
    }, 1000);
  });
  
  // 公開する関数
  return {
    // アプリの関数はここに追加
  };
})(); 