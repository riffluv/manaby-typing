/**
 * Firebase統合ランキングシステム
 * 全てのランキング関連機能を一元管理
 */

// Manabyオブジェクトがなければ初期化
if (!window.Manaby) window.Manaby = {};

// Firebaseモジュール
Manaby.Firebase = (function() {
  // Firebase構成とデータベース参照の初期化
  const firebaseConfig = {
    apiKey: "AIzaSyBB6UAYtMbTbf2pMlIAmz79MXPzLYx6ohg",
    authDomain: "manaby-typing.firebaseapp.com",
    databaseURL: "https://manaby-typing-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "manaby-typing",
    storageBucket: "manaby-typing.appspot.com",
    messagingSenderId: "58110409261",
    appId: "1:58110409261:web:1f23739378545fab9196a4",
    measurementId: "G-FSD7ECC1B0"
  };

  // Firebase初期化ステータスの追跡
  let isInitialized = false;
  let database = null;

  // セッション変数の追加 - 現在のスコア登録セッションを追跡
  let currentScoreSessionId = null;
  let registeredScoreSessions = [];

  // セッションIDを生成する関数
  function _generateSessionId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // 結果画面表示時に新しいセッションIDを生成する
  function _generateNewScoreSession() {
    currentScoreSessionId = _generateSessionId();
    console.log('新しいスコアセッションを生成しました:', currentScoreSessionId);
    return currentScoreSessionId;
  }

  // Firebase初期化関数
  function _initializeFirebase() {
    if (isInitialized) return true;

    try {
      if (!window.firebase) {
        console.error('Firebase SDKが読み込まれていません');
        return false;
      }

      // Firebase初期化（既に初期化されていない場合）
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      database = firebase.database();
      
      // 接続設定を緩和（緊急対応）
      database.ref().child('.info/connected').on('value', function(snap) {
        if (snap.val() === true) {
          console.log('Firebase接続成功！');
        } else {
          console.log('Firebase接続試行中...');
        }
      });
      
      isInitialized = true;
      console.log('Firebase初期化成功');
      
      return true;
    } catch (error) {
      console.error('Firebase初期化エラー:', error);
      return false;
    }
  }

  /**
   * スコアを送信する関数
   * @param {Object} data スコアデータ
   */
  function _submitScore(data) {
    if (!_initializeFirebase()) {
      console.error('Firebase初期化に失敗したためスコアを送信できません');
      return Promise.reject(new Error('Firebase未初期化'));
    }

    // スコアデータをFirebaseに送信
    return database.ref('scores').push(data)
      .then(() => {
        console.log('スコアが正常に送信されました:', data);
        return data;
      })
      .catch(error => {
        console.error('スコア送信エラー:', error);
        // オフラインスコアとして保存
        _saveOfflineScore(data);
        throw error;
      });
  }

  /**
   * オフラインスコアをローカルストレージに保存
   * @param {Object} data スコアデータ
   */
  function _saveOfflineScore(data) {
    try {
      const offlineScores = JSON.parse(localStorage.getItem('offlineScores') || '[]');
      offlineScores.push(data);
      localStorage.setItem('offlineScores', JSON.stringify(offlineScores));
      console.log('スコアをオフラインで保存しました');
    } catch (e) {
      console.error('オフラインスコア保存エラー:', e);
    }
  }

  /**
   * オフラインスコアを送信試行する関数
   */
  function _syncOfflineScores() {
    if (!_initializeFirebase()) return;

    try {
      const offlineScores = JSON.parse(localStorage.getItem('offlineScores') || '[]');
      if (offlineScores.length === 0) return;

      console.log(`${offlineScores.length}件のオフラインスコアを同期します`);

      const promises = offlineScores.map(score => 
        database.ref('scores').push(score)
          .then(() => true)
          .catch(() => false)
      );

      Promise.allSettled(promises).then(results => {
        // 成功したスコアのみを除外して保存し直す
        const failedScores = offlineScores.filter((_, index) => 
          results[index].status === 'rejected' || results[index].value === false
        );
        
        localStorage.setItem('offlineScores', JSON.stringify(failedScores));
        console.log(`オフラインスコア同期完了: ${offlineScores.length - failedScores.length}件成功, ${failedScores.length}件失敗`);
      });
    } catch (e) {
      console.error('オフラインスコア同期エラー:', e);
    }
  }

  /**
   * ランキングデータを読み込む関数
   * @param {string} gameMode ゲームモード
   * @returns {Promise} ランキングデータのPromise
   */
  function _loadRanking(gameMode) {
    console.log(`${gameMode}モードのランキングデータを読み込みます`);
    
    // テーブル要素を取得
    const tableBody = document.querySelector(`.ranking-tab-content[data-mode="${gameMode}"] tbody`);
    if (!tableBody) {
      console.error(`ランキングテーブルが見つかりません: ${gameMode}`);
      return Promise.reject(new Error('テーブル要素なし'));
    }
    
    // 読み込み中メッセージを表示
    tableBody.innerHTML = '<tr class="loading-row"><td colspan="6">ランキングを読み込み中...</td></tr>';
    
    // タイムアウト処理を設定
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (tableBody.querySelector('.loading-row')) {
          console.warn('読み込みタイムアウト');
          reject(new Error('timeout'));
        }
      }, 10000); // タイムアウトを10秒に延長
      
      // Firebaseが初期化できなければローカルデータを表示
      if (!_initializeFirebase()) {
        clearTimeout(timeoutId);
        reject(new Error('firebase-init-failed'));
        return;
      }
      
      console.log('Firebase接続OK、ランキングデータを取得します');
      
      // Firebaseからデータを取得
      database.ref('scores')
        .orderByChild('score')
        .limitToLast(50) // 余裕を持って取得
        .once('value')
        .then(snapshot => {
          clearTimeout(timeoutId);
          console.log('Firebaseからデータ取得成功');
          
          if (!snapshot || !snapshot.exists()) {
            reject(new Error('no-data'));
            return;
          }
          
          const rankings = [];
          
          // データをフィルターしてゲームモードに合致するものだけを抽出
          snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            if (data && data.gameMode === gameMode) {
              rankings.push({
                key: childSnapshot.key,
                ...data
              });
            }
          });
          
          if (rankings.length === 0) {
            reject(new Error('no-data-for-mode'));
            return;
          }
          
          resolve(rankings);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.error('Firebase取得エラー:', error);
          reject(error);
        });
    });
  }

  /**
   * ランキングデータを処理して表示する関数
   * @param {Array} rankings ランキングデータ配列
   * @param {string} gameMode ゲームモード
   */
  function _displayRankings(rankings, gameMode) {
    // テーブル要素を取得
    const tableBody = document.querySelector(`.ranking-tab-content[data-mode="${gameMode}"] tbody`);
    if (!tableBody) return;
    
    // 降順ソート
    rankings.sort((a, b) => b.score - a.score);
    
    // テーブルをクリア
    tableBody.innerHTML = '';
    
    // 上位15件を表示
    rankings.slice(0, 15).forEach((rank, index) => {
      const row = document.createElement('tr');
      row.classList.add(`rank-${index + 1}`);
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${_escapeHtml(rank.username || 'Anonymous')}</td>
        <td>${rank.score}</td>
        <td>${rank.stats && rank.stats.wpm || '-'}</td>
        <td>${rank.stats && rank.stats.keystrokes || '-'}</td>
        <td>${_formatDate(rank.timestamp)}</td>
      `;
      
      tableBody.appendChild(row);
    });
    
    console.log(`${rankings.length}件のランキングデータを表示しました`);
  }

  /**
   * ローカルランキングデータを表示する関数
   * @param {string} gameMode ゲームモード
   */
  function _displayLocalRankings(gameMode) {
    console.log(`${gameMode}モードのローカルランキングデータを表示します`);
    
    // テーブル要素を取得
    const tableBody = document.querySelector(`.ranking-tab-content[data-mode="${gameMode}"] tbody`);
    if (!tableBody) return;
    
    // テーブルをクリア
    tableBody.innerHTML = '';
    
    // データがないメッセージを表示
    const noDataRow = document.createElement('tr');
    noDataRow.innerHTML = '<td colspan="6" style="text-align:center; padding:30px;">このモードのランキングデータはまだありません</td>';
    tableBody.appendChild(noDataRow);
    
    // 説明を追加
    const notice = document.createElement('tr');
    notice.className = 'offline-notice';
    notice.innerHTML = '<td colspan="6" style="text-align:center; font-size:0.8em; color:#999;">※プレイしてスコアを登録してみましょう</td>';
    tableBody.appendChild(notice);
  }

  /**
   * 日付を整形する関数
   * @param {string|number} timestamp タイムスタンプ
   * @returns {string} 整形された日付文字列
   */
  function _formatDate(timestamp) {
    if (!timestamp) return '-';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '-';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}/${month}/${day}`;
    } catch (e) {
      return '-';
    }
  }

  /**
   * HTMLをエスケープする関数 (XSS対策)
   * @param {string} text エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  function _escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * ゲームモードの日本語名を取得する関数
   * @param {string} mode ゲームモード
   * @returns {string} ゲームモードの日本語名
   */
  function _getModeName(mode) {
    switch (mode) {
      case 'standard': return 'スタンダード';
      case 'timeAttack': return 'タイムアタック';
      case 'endless': return 'エンドレス';
      default: return mode;
    }
  }

  /**
   * ランキング登録フォームを表示する関数
   * @param {number} score スコア
   * @param {string} gameMode ゲームモード
   */
  function _showRegisterForm(score, gameMode) {
    console.log(`ランキング登録フォームを表示: ${gameMode}モード, スコア=${score}`);
    
    const savedUsername = localStorage.getItem('username') || '';
    
    // レトロポップアップスタイルを使用するようにHTML変更
    const formHTML = `
      <div id="register-form-overlay" class="popup-overlay active">
        <div class="retro-popup">
          <div class="popup-header">
            <h3>ランキング登録</h3>
            <button id="register-form-close" class="popup-close-btn">×</button>
          </div>
          <div class="popup-content">
            <form id="ranking-form">
              <div class="popup-section">
                <div class="input-group">
                  <label for="register-username">ユーザー名：</label>
                  <input type="text" id="register-username" maxlength="15" value="${savedUsername}" placeholder="ニックネーム（15文字まで）" required autocomplete="off">
                </div>
                <div class="score-display">
                  <p>モード: <span class="highlight">${_getModeName(gameMode)}</span></p>
                  <p>スコア: <span class="highlight">${score}</span></p>
                </div>
                <div id="register-message" class="register-message"></div>
              </div>
              <div class="form-buttons">
                <button type="submit" id="submit-score-btn" class="pixel-button">登録する</button>
                <button type="button" id="cancel-form-btn" class="pixel-button">キャンセル</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // 既存のポップアップがあれば削除
    const existingPopup = document.getElementById('register-form-overlay');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // ボディにフォームを追加
    document.body.insertAdjacentHTML('beforeend', formHTML);
    
    // フォーム要素の参照
    const form = document.getElementById('ranking-form');
    const messageContainer = document.getElementById('register-message');
    const submitButton = document.getElementById('submit-score-btn');
    const popupOverlay = document.getElementById('register-form-overlay');
    const closeButton = document.getElementById('register-form-close');
    const usernameInput = document.getElementById('register-username');
    
    // ユーザー名入力フィールドにフォーカス
    setTimeout(() => {
      if (usernameInput) {
        usernameInput.focus();
        // 入力値を一度クリアして再設定（バックスペース問題対策）
        const currentValue = usernameInput.value;
        usernameInput.value = '';
        usernameInput.value = currentValue;
      }
    }, 100);
    
    // フォーム送信イベント
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // 効果音を再生
      if (window.audio && typeof window.audio.playButtonSound === 'function') {
        window.audio.playButtonSound();
      }
      
      const username = document.getElementById('register-username').value.trim();
      if (!username) {
        _showFormMessage('エラー: ユーザー名を入力してください', true);
        return;
      }
      
      // 送信中状態
      submitButton.disabled = true;
      submitButton.textContent = '登録中...';
      _showFormMessage('スコアを送信しています...', false);
      
      // WPMと打鍵数を取得
      const wpm = document.getElementById('wpm-value') ? 
                 parseInt(document.getElementById('wpm-value').textContent, 10) || 0 : 0;
      const keystrokes = document.getElementById('keystrokes') ? 
                       parseInt(document.getElementById('keystrokes').textContent, 10) || 0 : 0;
      
      // スコアデータを作成
      const scoreData = {
        username: username,
        score: score,
        gameMode: gameMode,
        timestamp: new Date().toISOString(),
        stats: { wpm, keystrokes },
        sessionId: currentScoreSessionId
      };
      
      // ユーザー名を保存
      localStorage.setItem('username', username);
      
      // スコアを送信
      _submitScore(scoreData)
        .then(() => {
          // 登録済みセッションに追加
          if (currentScoreSessionId) {
            registeredScoreSessions.push(currentScoreSessionId);
            console.log('スコアを登録済みとして記録:', currentScoreSessionId);
          }
          
          _showSuccessMessage();
          
          // 現在のタブのランキングを再読み込み
          setTimeout(() => {
            showLeaderboard();
          }, 1000);
        })
        .catch(error => {
          console.error('スコア登録エラー:', error);
          
          // エラーメッセージを表示
          submitButton.disabled = false;
          submitButton.textContent = '登録する';
          
          if (error.message === 'Firebase未初期化') {
            _showFormMessage('サーバーに接続できません。オフラインで保存しました。', true);
            
            // 登録済みセッションに追加（オフライン保存でも登録済みとする）
            if (currentScoreSessionId) {
              registeredScoreSessions.push(currentScoreSessionId);
              console.log('オフラインスコアを登録済みとして記録:', currentScoreSessionId);
            }
            
            // オフライン保存成功通知
            setTimeout(() => {
              _showSuccessMessage(true);
            }, 1500);
          } else {
            _showFormMessage('エラー: スコア登録に失敗しました。', true);
          }
        });
    });
    
    // クローズボタン
    closeButton.addEventListener('click', function() {
      // 効果音を再生
      if (window.audio && typeof window.audio.playButtonSound === 'function') {
        window.audio.playButtonSound();
      }
      popupOverlay.remove();
    });
    
    // キャンセルボタン
    document.getElementById('cancel-form-btn').addEventListener('click', function() {
      // 効果音を再生
      if (window.audio && typeof window.audio.playButtonSound === 'function') {
        window.audio.playButtonSound();
      }
      popupOverlay.remove();
    });
    
    // Escキーでフォームを閉じる
    document.addEventListener('keydown', function closeOnEsc(e) {
      if (e.key === 'Escape' && popupOverlay) {
        popupOverlay.remove();
        document.removeEventListener('keydown', closeOnEsc);
      }
    });
    
    // フォームメッセージ表示関数
    function _showFormMessage(message, isError) {
      messageContainer.textContent = message;
      messageContainer.className = 'register-message';
      messageContainer.classList.add(isError ? 'error' : 'info');
      messageContainer.style.display = 'block';
      
      // スタイル追加
      messageContainer.style.padding = '8px';
      messageContainer.style.margin = '10px 0';
      messageContainer.style.textAlign = 'center';
      messageContainer.style.borderRadius = '4px';
      
      if (isError) {
        messageContainer.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
        messageContainer.style.border = '1px solid #f44';
        messageContainer.style.color = '#f66';
      } else {
        messageContainer.style.backgroundColor = 'rgba(70, 130, 180, 0.2)';
        messageContainer.style.border = '1px solid #4682b4';
        messageContainer.style.color = '#4682b4';
      }
    }
    
    // 成功メッセージ表示
    function _showSuccessMessage(isOffline = false) {
      const popupContent = document.querySelector('#register-form-overlay .popup-content');
      
      if (popupContent) {
        popupContent.innerHTML = `
          <div class="popup-section">
            <h3>${isOffline ? 'オフライン保存完了' : '登録完了！'}</h3>
            <div class="success-icon">✓</div>
            <p>${isOffline ? 'スコアをオフラインで保存しました<br>インターネット接続時に自動的に送信されます' : 'スコアをランキングに登録しました'}</p>
            <button id="close-success-btn" class="pixel-button">閉じる</button>
          </div>
        `;
        
        // スタイル調整
        const successIcon = popupContent.querySelector('.success-icon');
        if (successIcon) {
          successIcon.style.fontSize = '48px';
          successIcon.style.color = '#4CAF50';
          successIcon.style.margin = '15px 0';
          successIcon.style.animation = 'pulse 1s infinite alternate';
          successIcon.style.textAlign = 'center';
        }
        
        // 3秒後に自動的に閉じる
        setTimeout(() => {
          if (popupOverlay && document.body.contains(popupOverlay)) {
            popupOverlay.remove();
          }
        }, 3000);
        
        // 閉じるボタン
        const closeBtn = document.getElementById('close-success-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', function() {
            popupOverlay.remove();
          });
        }
      }
    }
  }

  /**
   * ランキングを表示する
   * パブリック関数
   */
  function showLeaderboard() {
    console.log('ランキングを表示します');
    
    // ランキング画面要素
    const rankingScreen = document.getElementById('ranking-screen');
    if (!rankingScreen) {
      console.error('ランキング画面が見つかりません');
      return;
    }
    
    // 画面を表示
    rankingScreen.style.display = 'flex';
    rankingScreen.classList.add('active');
    
    // アクティブなタブからゲームモードを取得
    const activeTab = rankingScreen.querySelector('.ranking-tab.active');
    const gameMode = activeTab ? activeTab.dataset.mode : 'standard';
    
    // オンラインモードに戻す
    // ランキングデータをロード
    _loadRanking(gameMode)
      .then(rankings => {
        _displayRankings(rankings, gameMode);
      })
      .catch(error => {
        console.warn('ランキングロードエラー:', error.message);
        _displayLocalRankings(gameMode);
      });
    
    // タブ切り替え時のイベントを設定
    rankingScreen.querySelectorAll('.ranking-tab').forEach(tab => {
      // 既存のイベントリスナーを削除するためクローンで置換
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
      
      newTab.addEventListener('click', function() {
        // アクティブクラスを切り替え
        rankingScreen.querySelectorAll('.ranking-tab').forEach(t => {
          t.classList.remove('active');
        });
        this.classList.add('active');
        
        // コンテンツ表示切り替え
        const mode = this.dataset.mode;
        rankingScreen.querySelectorAll('.ranking-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        const targetContent = rankingScreen.querySelector(`.ranking-tab-content[data-mode="${mode}"]`);
        if (targetContent) {
          targetContent.classList.add('active');
          
          // オンラインモードに戻す
          // 新しいタブのデータをロード
          _loadRanking(mode)
            .then(rankings => {
              _displayRankings(rankings, mode);
            })
            .catch(error => {
              console.warn('タブ切り替え時のランキングロードエラー:', error.message);
              _displayLocalRankings(mode);
            });
        }
      });
    });
    
    // キーボードショートカットを有効化
    document.addEventListener('keydown', handleKeyboardShortcuts);
  }

  /**
   * キーボードショートカット処理
   * @param {KeyboardEvent} event キーボードイベント
   */
  function handleKeyboardShortcuts(event) {
    // Escキーでランキング画面を閉じる
    if (event.key === 'Escape') {
      const rankingScreen = document.getElementById('ranking-screen');
      if (rankingScreen && rankingScreen.classList.contains('active')) {
        rankingScreen.classList.remove('active');
        rankingScreen.style.display = 'none';
        
        // ショートカットを無効化
        document.removeEventListener('keydown', handleKeyboardShortcuts);
      }
    }
  }

  /**
   * スコア登録を開始する
   * パブリック関数
   */
  function registerScore() {
    console.log('スコア登録を開始します');
    
    // 結果画面が表示されているか確認
    const resultScreen = document.getElementById('result-screen');
    if (!resultScreen || !resultScreen.classList.contains('active')) {
      alert('ランキング登録は結果画面からのみ可能です');
      return;
    }
    
    // スコアを取得
    const finalScoreElement = document.getElementById('final-score');
    if (!finalScoreElement) {
      alert('スコア情報が見つかりません');
      return;
    }
    
    const score = parseInt(finalScoreElement.textContent, 10) || 0;
    if (score <= 0) {
      alert('有効なスコアがありません');
      return;
    }
    
    // 既に登録済みか確認
    if (currentScoreSessionId && registeredScoreSessions.includes(currentScoreSessionId)) {
      alert('このスコアは既に登録済みです');
      return;
    }
    
    // アクティブなゲームモードを取得（タブから）
    const activeTab = document.querySelector('.ranking-tab.active');
    const gameMode = activeTab ? activeTab.dataset.mode : 'standard';
    
    // 登録フォームを表示（オンラインモードに戻す）
    _showRegisterForm(score, gameMode);
  }

  // イベントリスナーを設定する（DOM読み込み完了後）
  function setupEventListeners() {
    console.log('ランキング関連イベントリスナーを設定します');
    
    // 戻るボタン
    const backButton = document.getElementById('ranking-back');
    if (backButton) {
      backButton.addEventListener('click', function() {
        const rankingScreen = document.getElementById('ranking-screen');
        if (rankingScreen) {
          rankingScreen.classList.remove('active');
          rankingScreen.style.display = 'none';
          
          // キーボードショートカットを無効化
          document.removeEventListener('keydown', handleKeyboardShortcuts);
        }
      });
    }
    
    // 登録ボタン
    const registerButton = document.getElementById('ranking-register');
    if (registerButton) {
      registerButton.addEventListener('click', registerScore);
    }
    
    // ランキングボタン（結果画面）
    const showRankingButton = document.getElementById('show-ranking');
    if (showRankingButton) {
      showRankingButton.addEventListener('click', showLeaderboard);
    }
    
    // オフラインスコア同期試行
    _syncOfflineScores();
  }

  // DOMロード完了時にイベントを設定
  document.addEventListener('DOMContentLoaded', setupEventListeners);
  
  // 遅延実行を追加（フォールバック対策）
  setTimeout(setupEventListeners, 1000);

  // パブリックAPI
  return {
    showLeaderboard: showLeaderboard,
    registerScore: registerScore,
    generateNewScoreSession: _generateNewScoreSession,
    // テスト用に一部の内部関数を公開
    loadRanking: _loadRanking,
    displayRankings: _displayRankings
  };
})(); 