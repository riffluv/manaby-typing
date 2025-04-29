'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/admin/AdminPopup.module.css';
import { useGameContext } from '../../contexts/GameContext';
import html2canvas from 'html2canvas';
import FirebaseUtils from '../../utils/FirebaseUtils';

// デバッグモード設定（本番環境ではfalseに設定）
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// ログ出力用ヘルパー関数
const logDebug = (message, data) => {
  if (DEBUG_MODE) {
    console.log(message, data);
  }
};

const logError = (message, error) => {
  console.error(message, error);
};

const AdminPopup = ({ isOpen, onClose, backgroundRef }) => {
  const { gameState, setGameState, currentScreen } = useGameContext();
  const [problemCount, setProblemCount] = useState(5); // デフォルト値は5問
  const [activeTab, setActiveTab] = useState('settings'); // 'settings'、'background'、または 'gallery'
  const [isSavingBackground, setIsSavingBackground] = useState(false); // 保存中状態
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // 保存成功メッセージ表示状態
  const [playerName, setPlayerName] = useState(''); // プレイヤー名入力用
  const [savedBackgrounds, setSavedBackgrounds] = useState([]); // 保存された背景の一覧
  const [isLoading, setIsLoading] = useState(false); // 背景読み込み中状態
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false); // 復元成功メッセージ表示状態
  const [selectedScreen, setSelectedScreen] = useState('ALL'); // 背景を保存/適用する画面
  const [captureMode, setCaptureMode] = useState('spa'); // 'spa'または'container'

  // 画面一覧の定義
  const screenOptions = [
    { id: 'ALL', name: '全ての画面' },
    { id: 'MAIN_MENU', name: 'メインメニュー' },
    { id: 'GAME', name: 'ゲーム画面' },
    { id: 'RESULT', name: 'リザルト画面' },
    { id: 'RANKING', name: 'ランキング画面' },
    { id: 'SETTINGS', name: '設定画面' },
    { id: 'CREDITS', name: 'クレジット画面' },
  ];

  // メインコンテナ要素を取得する共通関数（App Router & 従来のPage Router両対応）
  const getMainContainer = useCallback(() => {
    const container = 
      document.querySelector('body > div') || // App Routerの一般的な構造
      document.querySelector('#__next > div') || // 従来のページルーター
      document.querySelector('main') || // mainタグ
      document.body; // どれも見つからなければbody要素を使用
    
    if (!container) {
      throw new Error('メインコンテナ要素が見つかりません');
    }
    
    return container;
  }, []);

  // 成功メッセージを表示する共通関数
  const showSuccessMessage = useCallback((setStateFunction) => {
    setStateFunction(true);
    setTimeout(() => {
      setStateFunction(false);
    }, 3000); // 3秒後に消える
  }, []);

  // コンポーネントがマウントされたときに現在のお題数を取得
  useEffect(() => {
    // gameStateからクリア条件のお題数を取得
    const currentRequiredCount = gameState.requiredProblemCount || 5;
    logDebug('[管理者モード] 現在のお題数設定:', currentRequiredCount);
    setProblemCount(currentRequiredCount);

    // 初期の選択画面を現在表示中の画面にする
    setSelectedScreen(currentScreen || 'ALL');
  }, [gameState, isOpen, currentScreen]); // isOpenが変わった時も再取得

  // モーダルが開かれた時と画面選択が変わった時に背景の一覧を取得
  useEffect(() => {
    if (isOpen && activeTab === 'gallery' && selectedScreen) {
      fetchSavedBackgrounds();
    }
  }, [isOpen, activeTab, selectedScreen]);

  // 保存された背景を取得
  const fetchSavedBackgrounds = async () => {
    setIsLoading(true);
    try {
      // 選択されている画面用の背景を取得（ScreenId指定）
      const backgrounds = await FirebaseUtils.getScreenBackgroundsFromFirebase(
        selectedScreen,
        20
      );
      logDebug(`${getScreenDisplayName(selectedScreen)}用の背景を取得しました:`, backgrounds.length);
      setSavedBackgrounds(backgrounds);
    } catch (error) {
      logError('背景の取得中にエラーが発生しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 画面IDから表示名を取得する関数
  const getScreenDisplayName = useCallback((screenId) => {
    const screen = screenOptions.find((s) => s.id === screenId);
    return screen ? screen.name : screenId;
  }, [screenOptions]);

  // エスケープキーでポップアップを閉じる
  const handleEscKey = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // キーボードイベントのリスナーを追加
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, handleEscKey]);

  // オーバーレイクリックでポップアップを閉じる
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains(styles.adminPopup__overlay)) {
      onClose();
    }
  };

  // 保存ボタンがクリックされたときの処理
  const handleSave = () => {
    logDebug('[管理者設定] お題数を変更:', problemCount);

    // お題数をgameStateに保存
    const updatedGameState = {
      ...gameState,
      requiredProblemCount: problemCount,
    };

    // 更新
    setGameState(updatedGameState);
    onClose();
  };

  // 背景を保存する関数
  const captureAndSaveBackground = async () => {
    try {
      setIsSavingBackground(true);
      let targetElement;
      
      // キャプチャするターゲット要素を決定
      if (captureMode === 'container') {
        // 外側のコンテナ（レトロドットパターン背景）をキャプチャ
        if (backgroundRef?.current) {
          targetElement = backgroundRef.current;
          logDebug('背景ドットパターンをキャプチャします:', targetElement);
        } else {
          throw new Error('背景要素の参照が取得できません');
        }
      } else {
        // 従来通りSPAのメインコンテナをキャプチャ
        targetElement = getMainContainer();
        logDebug('SPAメインコンテナをキャプチャします:', targetElement);
      }

      // キャプチャ実行
      const canvas = await html2canvas(targetElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: DEBUG_MODE,
      });

      // Base64形式の画像データに変換
      const imageData = canvas.toDataURL('image/png');

      // 背景のタイトルを生成（キャプチャモードを含める）
      const modeText = captureMode === 'container' ? 'ドット背景' : 'SPA画面';
      const backgroundTitle = `${playerName || '管理者'}の${getScreenDisplayName(selectedScreen)}用${modeText}`;

      // Firebaseに画面指定で保存
      const backgroundId = await FirebaseUtils.saveScreenBackgroundToFirebase(
        selectedScreen,
        playerName || '管理者',
        imageData,
        backgroundTitle,
        { captureMode } // キャプチャモードも保存
      );

      if (backgroundId) {
        logDebug('背景を保存しました！ ID:', backgroundId);
        showSuccessMessage(setShowSaveSuccess);

        // 背景一覧を更新
        if (activeTab === 'gallery') {
          fetchSavedBackgrounds();
        }
      }
    } catch (error) {
      logError('背景の保存中にエラーが発生しました:', error);
    } finally {
      setIsSavingBackground(false);
    }
  };

  // 背景を適用する関数
  const applyBackground = (background) => {
    try {
      // メインコンテナ要素を取得
      const mainContainer = getMainContainer();
      logDebug('背景を適用するコンテナ要素:', mainContainer);

      // 背景画像データと適用する画面のIDを取得
      const backgroundImageData = background.imageData;
      const cssStyleInfo = background.cssStyleInfo || null;
      const targetScreen = background.screenId || 'ALL';

      // CSSスタイル情報を適用
      if (cssStyleInfo) {
        Object.entries(cssStyleInfo).forEach(([key, value]) => {
          // backgroundImage は画像データから設定するので除外
          if (key !== 'backgroundImage') {
            mainContainer.style[key] = value;
          }
        });
      }

      // 背景画像を適用
      mainContainer.style.backgroundImage = `url(${backgroundImageData})`;
      mainContainer.style.backgroundSize = 'cover';
      mainContainer.style.backgroundPosition = 'center';

      // localStorage に情報を保存
      try {
        // 管理者フラグと背景画像を保存
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem(`savedBackgroundImage_${targetScreen}`, backgroundImageData);

        // スタイル情報も保存
        if (cssStyleInfo) {
          localStorage.setItem(`savedBackgroundStyle_${targetScreen}`, JSON.stringify(cssStyleInfo));
        }

        // アクティブな背景情報を更新
        const activeBackgrounds = JSON.parse(localStorage.getItem('activeBackgrounds') || '{}');
        activeBackgrounds[targetScreen] = {
          id: background.id,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem('activeBackgrounds', JSON.stringify(activeBackgrounds));

        logDebug(`${getScreenDisplayName(targetScreen)}用の背景を適用しました`);
      } catch (storageError) {
        logError('背景情報をlocalStorageに保存できませんでした:', storageError);
      }

      // 保存した背景を適用したメッセージを表示
      showSuccessMessage(setShowRestoreSuccess);

    } catch (error) {
      logError('背景の適用中にエラーが発生しました:', error);
    }
  };

  // 背景をリセットして元に戻す関数
  const resetBackground = () => {
    try {
      // メインコンテナ要素を取得
      const mainContainer = getMainContainer();
      logDebug('背景をリセットするコンテナ要素:', mainContainer);

      // 背景をリセット（backgroundImageプロパティを削除）
      mainContainer.style.backgroundImage = '';

      // 選択されている画面の保存済み背景を削除
      try {
        localStorage.removeItem(`savedBackgroundImage_${selectedScreen}`);
        localStorage.removeItem(`savedBackgroundStyle_${selectedScreen}`);

        // アクティブ背景情報も更新
        const activeBackgrounds = JSON.parse(localStorage.getItem('activeBackgrounds') || '{}');
        delete activeBackgrounds[selectedScreen];
        localStorage.setItem('activeBackgrounds', JSON.stringify(activeBackgrounds));
        
        logDebug(`${getScreenDisplayName(selectedScreen)}の背景をリセットしました`);
      } catch (e) {
        logError('localStorageの操作中にエラーが発生しました:', e);
      }

      // 成功メッセージを表示
      showSuccessMessage(setShowRestoreSuccess);
    } catch (error) {
      logError('背景のリセット中にエラーが発生しました:', error);
    }
  };

  // 背景を削除する関数
  const deleteBackground = async (backgroundId) => {
    if (!window.confirm('この背景を本当に削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      // FirebaseUtilsを使って背景を削除
      const success = await FirebaseUtils.deleteBackgroundFromFirebase(backgroundId);

      if (success) {
        logDebug('背景を削除しました:', backgroundId);
        showSuccessMessage(setShowRestoreSuccess);
        
        // 背景一覧を更新
        fetchSavedBackgrounds();
      }
    } catch (error) {
      logError('背景の削除中にエラーが発生しました:', error);
    }
  };

  // 各種イベントハンドラー
  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleTabChange = (tab) => setActiveTab(tab);
  const handleScreenChange = (e) => setSelectedScreen(e.target.value);
  const handleCaptureModeChange = (mode) => setCaptureMode(mode);

  if (!isOpen) return null;

  // JSXレンダリング部分
  return (
    <div className={styles.adminPopup__overlay} onClick={handleOverlayClick}>
      <div className={styles.adminPopup}>
        <div className={styles.adminPopup__header}>
          <h2 className={styles.adminPopup__title}>管理者設定</h2>
          <button
            className={styles.adminPopup__closeButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* タブメニュー */}
        <div className={styles.adminPopup__tabs}>
          <button
            className={`${styles.adminPopup__tab} ${
              activeTab === 'settings' ? styles['adminPopup__tab--active'] : ''
            }`}
            onClick={() => handleTabChange('settings')}
          >
            設定
          </button>
          <button
            className={`${styles.adminPopup__tab} ${
              activeTab === 'background'
                ? styles['adminPopup__tab--active']
                : ''
            }`}
            onClick={() => handleTabChange('background')}
          >
            背景保存
          </button>
          <button
            className={`${styles.adminPopup__tab} ${
              activeTab === 'gallery' ? styles['adminPopup__tab--active'] : ''
            }`}
            onClick={() => handleTabChange('gallery')}
          >
            着せ替え
          </button>
        </div>

        <div className={styles.adminPopup__content}>
          {activeTab === 'settings' && (
            <div className={styles.adminPopup__formGroup}>
              <label
                className={styles.adminPopup__label}
                htmlFor="problemCount"
              >
                クリアに必要なお題数
              </label>
              <input
                className={styles.adminPopup__input}
                id="problemCount"
                type="number"
                min="1"
                max="20"
                value={problemCount}
                onChange={(e) =>
                  setProblemCount(parseInt(e.target.value, 10) || 1)
                }
              />
              <p className={styles.adminPopup__info}>
                ゲームをクリアするために必要なお題の数を設定します（1〜20の範囲）
              </p>
            </div>
          )}

          {activeTab === 'background' && (
            <div className={styles.adminPopup__backgroundSave}>
              <div className={styles.adminPopup__formGroup}>
                <label
                  className={styles.adminPopup__label}
                  htmlFor="playerName"
                >
                  保存者名
                </label>
                <input
                  className={styles.adminPopup__input}
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={handlePlayerNameChange}
                  placeholder="名前を入力（例：マナビー）"
                  maxLength={20}
                />
              </div>

              <div className={styles.adminPopup__formGroup}>
                <label
                  className={styles.adminPopup__label}
                  htmlFor="screenSelector"
                >
                  背景を適用する画面
                </label>
                <select
                  className={styles.adminPopup__select}
                  id="screenSelector"
                  value={selectedScreen}
                  onChange={handleScreenChange}
                >
                  {screenOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className={styles.adminPopup__info}>
                  背景を適用する画面を選択します。「全ての画面」を選ぶとすべての画面に適用されます。
                </p>
              </div>

              {/* キャプチャモード選択 */}
              <div className={styles.adminPopup__formGroup}>
                <label className={styles.adminPopup__label}>
                  キャプチャする範囲
                </label>
                <div className={styles.adminPopup__radioGroup}>
                  <label className={styles.adminPopup__radioLabel}>
                    <input
                      type="radio"
                      name="captureMode"
                      value="spa"
                      checked={captureMode === 'spa'}
                      onChange={() => handleCaptureModeChange('spa')}
                      className={styles.adminPopup__radio}
                    />
                    <span>SPA画面全体</span>
                  </label>
                  <label className={styles.adminPopup__radioLabel}>
                    <input
                      type="radio"
                      name="captureMode"
                      value="container"
                      checked={captureMode === 'container'}
                      onChange={() => handleCaptureModeChange('container')}
                      className={styles.adminPopup__radio}
                    />
                    <span>オレンジドット背景のみ</span>
                  </label>
                </div>
                <p className={styles.adminPopup__info}>
                  「SPA画面全体」：ゲーム画面を含むページ全体をキャプチャします。<br />
                  「オレンジドット背景のみ」：画面外側のドットパターン背景だけをキャプチャします。
                </p>
              </div>

              <div className={styles.adminPopup__formGroup}>
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--special']}`}
                  onClick={captureAndSaveBackground}
                  disabled={isSavingBackground}
                >
                  {isSavingBackground
                    ? '保存中...'
                    : `${captureMode === 'container' ? 'ドット背景' : 'SPA画面'}を${getScreenDisplayName(
                        selectedScreen
                      )}用に保存`}
                </button>
                <p className={styles.adminPopup__info}>
                  選択した範囲をキャプチャして保存します。保存した背景は後で再利用できます。
                </p>
              </div>

              {showSaveSuccess && (
                <div className={styles.adminPopup__successMessage}>
                  <span className={styles.adminPopup__successIcon}>✓</span>{' '}
                  背景を保存しました！
                </div>
              )}
            </div>
          )}

          {activeTab === 'gallery' && (
            <div className={styles.adminPopup__backgroundGallery}>
              <h3 className={styles.adminPopup__subTitle}>
                着せ替えギャラリー
              </h3>

              <div className={styles.adminPopup__formGroup}>
                <label
                  className={styles.adminPopup__label}
                  htmlFor="screenSelectorGallery"
                >
                  表示する画面
                </label>
                <select
                  className={styles.adminPopup__select}
                  id="screenSelectorGallery"
                  value={selectedScreen}
                  onChange={handleScreenChange}
                >
                  {screenOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}用
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.adminPopup__resetContainer}>
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--reset']}`}
                  onClick={resetBackground}
                >
                  {getScreenDisplayName(selectedScreen)}をデフォルトに戻す
                </button>
              </div>

              {isLoading ? (
                <div className={styles.adminPopup__loading}>読み込み中...</div>
              ) : savedBackgrounds.length === 0 ? (
                <p className={styles.adminPopup__info}>
                  {getScreenDisplayName(selectedScreen)}
                  用の保存された背景がありません
                </p>
              ) : (
                <div className={styles.adminPopup__grid}>
                  {savedBackgrounds.map((background) => (
                    <div
                      key={background.id}
                      className={styles.adminPopup__backgroundItem}
                    >
                      <div
                        className={styles.adminPopup__backgroundImageContainer}
                      >
                        <img
                          src={background.imageData}
                          alt={background.title || '保存された背景'}
                          className={styles.adminPopup__backgroundImage}
                        />
                      </div>
                      <div className={styles.adminPopup__backgroundInfo}>
                        <p className={styles.adminPopup__backgroundTitle}>
                          {background.title || '無題の背景'}
                        </p>
                        <p className={styles.adminPopup__backgroundMeta}>
                          {background.playerName || '匿名'} |
                          {background.screenId
                            ? ` ${getScreenDisplayName(background.screenId)}用`
                            : '全画面用'}{' '}
                          |
                          {background.cssStyleInfo?.captureMode === 'container' ? 'ドット背景' : 'SPA画面'} |
                          {new Date(background.timestamp).toLocaleDateString(
                            'ja-JP'
                          )}
                        </p>
                        <div className={styles.adminPopup__buttonGroup}>
                          <button
                            className={`${styles.adminPopup__button} ${styles['adminPopup__button--apply']}`}
                            onClick={() => applyBackground(background)}
                          >
                            適用
                          </button>
                          <button
                            className={`${styles.adminPopup__button} ${styles['adminPopup__button--delete']}`}
                            onClick={() => deleteBackground(background.id)}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showRestoreSuccess && (
                <div className={styles.adminPopup__successMessage}>
                  <span className={styles.adminPopup__successIcon}>✓</span>{' '}
                  背景を適用しました！
                </div>
              )}

              <div className={styles.adminPopup__refreshContainer}>
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--refresh']}`}
                  onClick={fetchSavedBackgrounds}
                  disabled={isLoading}
                >
                  {isLoading ? '更新中...' : '一覧を更新'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.adminPopup__footer}>
          <button
            className={`${styles.adminPopup__button} ${styles['adminPopup__button--secondary']}`}
            onClick={onClose}
          >
            閉じる
          </button>
          {activeTab === 'settings' && (
            <button
              className={`${styles.adminPopup__button} ${styles['adminPopup__button--primary']}`}
              onClick={handleSave}
            >
              保存
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPopup;
