// Firebaseのフックをセットアップ
function _setupFirebaseHooks() {
  console.log('Firebaseフックをセットアップします');
  
  // 結果画面が表示されたときのフック
  document.addEventListener('screenChanged', function(event) {
    const screenId = event.detail.screenId;
    
    if (screenId === 'result-screen') {
      // スコア送信フォーム表示
      if (typeof Manaby.Firebase.showSubmitForm === 'function') {
        Manaby.Firebase.showSubmitForm();
      }
      
      // ランキングボタンをセットアップ
      if (typeof Manaby.Firebase.setupRankingButton === 'function') {
        Manaby.Firebase.setupRankingButton();
      }
    }
  });
  
  // イベントハンドラをセットアップ（追加）
  _setupEventHandlers();
}

// 画面遷移時のイベント監視を設定
function _setupEventHandlers() {
  console.log('イベントハンドラをセットアップします');
  
  // 画面遷移イベントを監視
  document.addEventListener('screenChanged', function(event) {
    const screenId = event.detail.screenId;
    console.log('画面が変更されました: ' + screenId);
    
    // リザルト画面の場合
    if (screenId === 'result-screen') {
      _handleResultScreenShown();
    }
  });
}

// リザルト画面表示時の処理
function _handleResultScreenShown() {
  console.log('リザルト画面が表示されました');
  
  // ランキングボタンの設定
  const rankingButton = document.getElementById('show-ranking');
  if (rankingButton) {
    console.log('ランキングボタンを設定します');
    rankingButton.addEventListener('click', function() {
      console.log('ランキングボタンがクリックされました');
      if (typeof Manaby.Firebase !== 'undefined' && 
          typeof Manaby.Firebase.showLeaderboard === 'function') {
        Manaby.Firebase.showLeaderboard();
      } else {
        console.error('Firebase.showLeaderboard関数が見つかりません');
      }
    });
  } else {
    console.warn('ランキングボタンが見つかりません');
  }
}