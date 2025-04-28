'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from '../../styles/admin/AdminPopup.module.css';
import { useGameContext } from '../../contexts/GameContext';
import html2canvas from 'html2canvas';
import FirebaseUtils from '../../utils/FirebaseUtils';
import Image from 'next/image';

const AdminPopup = ({ isOpen, onClose }) => {
  const { gameState, setGameState } = useGameContext();
  const [problemCount, setProblemCount] = useState(5); // デフォルト値は5問
  const [activeTab, setActiveTab] = useState('settings'); // 'settings'、'background'、または 'gallery'
  const [isSavingBackground, setIsSavingBackground] = useState(false); // 保存中状態
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // 保存成功メッセージ表示状態
  const [playerName, setPlayerName] = useState(''); // プレイヤー名入力用
  const [savedBackgrounds, setSavedBackgrounds] = useState([]); // 保存された背景の一覧
  const [isLoading, setIsLoading] = useState(false); // 背景読み込み中状態
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false); // 復元成功メッセージ表示状態

  // コンポーネントがマウントされたときに現在のお題数を取得
  useEffect(() => {
    // gameStateからクリア条件のお題数を取得
    const currentRequiredCount = gameState.requiredProblemCount || 5;
    console.log('[管理者モード] 現在のお題数設定:', currentRequiredCount);
    setProblemCount(currentRequiredCount);
  }, [gameState, isOpen]); // isOpenが変わった時も再取得

  // モーダルが開かれた時に背景の一覧を取得
  useEffect(() => {
    if (isOpen && activeTab === 'gallery') {
      fetchSavedBackgrounds();
    }
  }, [isOpen, activeTab]);

  // 保存された背景を取得
  const fetchSavedBackgrounds = async () => {
    setIsLoading(true);
    try {
      const backgrounds = await FirebaseUtils.getBackgroundsFromFirebase(10); // 最新10件を取得
      console.log('保存された背景を取得しました:', backgrounds.length);
      setSavedBackgrounds(backgrounds);
    } catch (error) {
      console.error('背景の取得中にエラーが発生しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    // 現在の値をログに出力
    console.log('[管理者設定] 保存前のお題数:', gameState.requiredProblemCount);
    console.log('[管理者設定] 新しいお題数:', problemCount);

    // お題数をgameStateに保存
    const updatedGameState = {
      ...gameState,
      requiredProblemCount: problemCount,
    };

    // 更新
    setGameState(updatedGameState);

    // 保存後の状態を確認
    setTimeout(() => {
      console.log(
        '[管理者設定] 保存後のお題数:',
        updatedGameState.requiredProblemCount
      );
    }, 100);

    console.log(`[管理者設定] お題数を${problemCount}に変更しました`);
    onClose();
  };

  // 背景を保存する関数
  const captureAndSaveBackground = async () => {
    try {
      setIsSavingBackground(true);
      
      // メインコンテナ要素を取得
      const mainContainer = document.querySelector('#__next > div'); // Next.jsのルート要素の子要素
      if (!mainContainer) {
        console.error('メインコンテナ要素が見つかりません');
        setIsSavingBackground(false);
        return;
      }
      
      // キャプチャ実行
      const canvas = await html2canvas(mainContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: true,
      });
      
      // Base64形式の画像データに変換
      const imageData = canvas.toDataURL('image/png');
      
      // Firebaseに保存
      const backgroundId = await FirebaseUtils.saveBackgroundToFirebase(
        playerName || '管理者',
        imageData,
        `${playerName || '管理者'}の保存した背景`,
        { type: 'admin-saved-background' }
      );
      
      if (backgroundId) {
        // 保存成功メッセージを表示
        setShowSaveSuccess(true);
        console.log('背景を保存しました！ ID:', backgroundId);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 3000); // 3秒後に消える
        
        // 背景一覧を更新
        if (activeTab === 'gallery') {
          fetchSavedBackgrounds();
        }
      }
    } catch (error) {
      console.error('背景の保存中にエラーが発生しました:', error);
    } finally {
      setIsSavingBackground(false);
    }
  };
  
  // 背景を適用する関数
  const applyBackground = (background) => {
    try {
      // メインコンテナ要素を取得
      const mainContainer = document.querySelector('#__next > div');
      if (!mainContainer) {
        console.error('メインコンテナ要素が見つかりません');
        return;
      }
      
      // 背景画像データを取得
      const backgroundImageData = background.imageData;
      
      // 背景スタイル情報を取得
      const cssStyleInfo = background.cssStyleInfo || null;
      
      if (cssStyleInfo) {
        console.log('CSSスタイル情報を適用します:', cssStyleInfo);
        
        // CSS情報を適用
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
      
      // localStorage にスタイル情報を含めて保存
      try {
        localStorage.setItem('isAdmin', 'true'); // 管理者フラグを設定
        localStorage.setItem('savedBackgroundImage', backgroundImageData);
        
        // スタイル情報も保存
        if (cssStyleInfo) {
          localStorage.setItem('savedBackgroundStyle', JSON.stringify(cssStyleInfo));
        }
        
        console.log('背景画像とスタイル情報をlocalStorageに保存しました (管理者モード)');
      } catch (storageError) {
        console.error('背景情報をlocalStorageに保存できませんでした:', storageError);
      }
      
      // 保存した背景を適用したメッセージを表示
      setShowRestoreSuccess(true);
      setTimeout(() => {
        setShowRestoreSuccess(false);
      }, 3000);
      
      console.log('保存された背景を適用しました');
    } catch (error) {
      console.error('背景の適用中にエラーが発生しました:', error);
    }
  };
  
  // プレイヤー名の変更を処理
  const handlePlayerNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  // タブが変更された時の処理
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'gallery') {
      fetchSavedBackgrounds();
    }
  };

  // 背景をリセットして元に戻す関数
  const resetBackground = () => {
    try {
      // メインコンテナ要素を取得
      const mainContainer = document.querySelector('#__next > div');
      if (!mainContainer) {
        console.error('メインコンテナ要素が見つかりません');
        return;
      }
      
      // 背景をリセット（backgroundImageプロパティを削除）
      mainContainer.style.backgroundImage = '';
      
      // 保存されていた背景画像データを削除
      localStorage.removeItem('savedBackgroundImage');
      console.log('背景をリセットしました');
      
      // 成功メッセージを表示
      setShowRestoreSuccess(true);
      setTimeout(() => {
        setShowRestoreSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('背景のリセット中にエラーが発生しました:', error);
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
        // 削除成功メッセージを表示
        setShowRestoreSuccess(true);
        setTimeout(() => {
          setShowRestoreSuccess(false);
        }, 3000);
        
        // 背景一覧を更新
        fetchSavedBackgrounds();
      }
    } catch (error) {
      console.error('背景の削除中にエラーが発生しました:', error);
    }
  };

  if (!isOpen) return null;

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
        
        {/* タブメニュー追加 */}
        <div className={styles.adminPopup__tabs}>
          <button
            className={`${styles.adminPopup__tab} ${activeTab === 'settings' ? styles['adminPopup__tab--active'] : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            設定
          </button>
          <button
            className={`${styles.adminPopup__tab} ${activeTab === 'background' ? styles['adminPopup__tab--active'] : ''}`}
            onClick={() => handleTabChange('background')}
          >
            背景保存
          </button>
          <button
            className={`${styles.adminPopup__tab} ${activeTab === 'gallery' ? styles['adminPopup__tab--active'] : ''}`}
            onClick={() => handleTabChange('gallery')}
          >
            背景一覧
          </button>
        </div>
        
        <div className={styles.adminPopup__content}>
          {activeTab === 'settings' && (
            <div className={styles.adminPopup__formGroup}>
              <label className={styles.adminPopup__label} htmlFor="problemCount">
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
                <label className={styles.adminPopup__label} htmlFor="playerName">
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
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--special']}`}
                  onClick={captureAndSaveBackground}
                  disabled={isSavingBackground}
                >
                  {isSavingBackground ? '保存中...' : '現在の背景を保存'}
                </button>
                <p className={styles.adminPopup__info}>
                  現在表示されている背景をキャプチャして保存します。保存した背景は後で再利用できます。
                </p>
              </div>
              
              {showSaveSuccess && (
                <div className={styles.adminPopup__successMessage}>
                  <span className={styles.adminPopup__successIcon}>✓</span> 背景を保存しました！
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'gallery' && (
            <div className={styles.adminPopup__backgroundGallery}>
              <h3 className={styles.adminPopup__subTitle}>保存された背景一覧</h3>
              
              <div className={styles.adminPopup__resetContainer}>
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--reset']}`}
                  onClick={resetBackground}
                >
                  元の背景に戻す
                </button>
              </div>
              
              {isLoading ? (
                <div className={styles.adminPopup__loading}>読み込み中...</div>
              ) : savedBackgrounds.length === 0 ? (
                <p className={styles.adminPopup__info}>保存された背景がありません</p>
              ) : (
                <div className={styles.adminPopup__grid}>
                  {savedBackgrounds.map((background) => (
                    <div key={background.id} className={styles.adminPopup__backgroundItem}>
                      <div className={styles.adminPopup__backgroundImageContainer}>
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
                          {background.playerName || '匿名'} - 
                          {new Date(background.timestamp).toLocaleDateString('ja-JP')}
                        </p>
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
                  ))}
                </div>
              )}
              
              {showRestoreSuccess && (
                <div className={styles.adminPopup__successMessage}>
                  <span className={styles.adminPopup__successIcon}>✓</span> 背景を適用しました！
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
