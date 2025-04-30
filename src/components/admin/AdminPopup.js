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
  const [activeTab, setActiveTab] = useState('settings'); // 'settings'、'background'、'gallery'、または 'rankings'
  const [isSavingBackground, setIsSavingBackground] = useState(false); // 保存中状態
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // 保存成功メッセージ表示状態
  const [playerName, setPlayerName] = useState(''); // プレイヤー名入力用
  const [savedBackgrounds, setSavedBackgrounds] = useState([]); // 保存された背景の一覧
  const [isLoading, setIsLoading] = useState(false); // 背景読み込み中状態
  const [showRestoreSuccess, setShowRestoreSuccess] = useState(false); // 復元成功メッセージ表示状態
  const [selectedScreen, setSelectedScreen] = useState('ALL'); // 背景を保存/適用する画面
  const [captureMode, setCaptureMode] = useState('spa'); // 'spa', 'container', 'spa-background'
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal'); // ランキング削除時の選択難易度
  const [isDeletingRankings, setIsDeletingRankings] = useState(false); // ランキング削除中状態
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false); // 削除成功メッセージ表示状態

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

  // SPAの内部背景要素を取得する関数
  const getSpaBackgroundElement = useCallback(() => {
    try {
      logDebug('内部背景要素を検索中...');
      
      // より具体的なセレクタを最初に試す
      const specificSelectors = {
        'MAIN_MENU': [
          '[class*="MainMenu_mainContainer"]',
          '.MainMenu_mainContainer',
          '[class*="mainContainer"]',
          '.mainContainer',
          '#main-menu'
        ],
        'GAME': [
          '[class*="GameScreen_gameContainer"]',
          '.GameScreen_gameContainer',
          '[class*="gameContainer"]',
          '.gameContainer',
          '#game-screen'
        ],
        'RESULT': [
          '[class*="ResultScreen_container"]', 
          '.ResultScreen_container',
          '#result-screen'
        ],
        'RANKING': [
          '[class*="RankingScreen_container"]',
          '.RankingScreen_container',
          '#ranking-screen'
        ],
        'SETTINGS': [
          '[class*="SettingsScreen_container"]',
          '.SettingsScreen_container',
          '#settings-screen'
        ],
        'CREDITS': [
          '[class*="CreditsScreen_container"]',
          '.CreditsScreen_container',
          '#credits-screen'
        ]
      };
      
      // 汎用的なセレクタ - より多くのパターンを追加
      const genericSelectors = [
        // CSSモジュールの可能性を考慮したセレクタ
        '[class*="menu"]',
        '[class*="container"]',
        '[class*="content"]',
        '[class*="screen"]',
        '[class*="wrapper"]',
        '[class*="page"]',
        // 一般的なセレクタ
        '.container',
        '.main',
        '.content',
        '.app-container',
        // 最終的なフォールバック
        'main',
        '#__next > div',
        'body > div'
      ];
      
      // デバッグ出力
      logDebug(`現在の選択画面: ${selectedScreen}`);
      
      // 選択された画面に対応するセレクタを取得
      const screenSelectors = specificSelectors[selectedScreen] || [];
      
      // 複数のセレクタを順番に試す
      let element = null;
      
      // 特定の画面のセレクタを最初に試す
      for (const selector of screenSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        logDebug(`セレクタ "${selector}" で ${elements.length} 個の要素が見つかりました`);
        
        if (elements.length > 0) {
          // 表示されている要素を優先
          const visibleElements = elements.filter(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 50 && 
              rect.height > 50 &&
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= window.innerHeight &&
              rect.right <= window.innerWidth
            );
          });
          
          if (visibleElements.length > 0) {
            element = visibleElements[0];
            logDebug('表示中の要素を発見しました', element);
            break;
          } else if (!element) {
            element = elements[0];
            logDebug('非表示状態の要素を発見しました', element);
          }
        }
      }
      
      // 最初の試みで要素が見つからなかった場合、汎用セレクタを試す
      if (!element) {
        logDebug('特定の要素が見つからなかったため、汎用セレクタを試します');
        
        for (const selector of genericSelectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          
          if (elements.length > 0) {
            // 表示されていて十分なサイズを持つ要素を優先
            const visibleElements = elements.filter(el => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 100 && 
                rect.height > 100
              );
            });
            
            if (visibleElements.length > 0) {
              // サイズの大きい要素を優先（背景である可能性が高い）
              const sortedElements = visibleElements.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return (rectB.width * rectB.height) - (rectA.width * rectA.height);
              });
              
              element = sortedElements[0];
              logDebug('汎用セレクタから要素を発見しました', element);
              break;
            } else if (!element) {
              element = elements[0];
              logDebug('汎用セレクタから非表示要素を発見しました', element);
            }
          }
        }
      }
      
      // 特殊な最終手段 - MainMenuコンポーネントの検出を強化
      if (!element && selectedScreen === 'MAIN_MENU') {
        // document.body内のすべての子要素を取得し、最も大きな要素を見つける
        const allElements = Array.from(document.body.querySelectorAll('*'));
        const visibleLargeElements = allElements.filter(el => {
          // インラインスタイルをもつ最上位の要素を探す
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const isDirectBodyChild = el.parentNode === document.body || el.parentNode.parentNode === document.body;
          const hasSize = rect.width > 200 && rect.height > 200;
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
          
          return isDirectBodyChild && hasSize && isVisible;
        });
        
        // サイズの大きい順にソート
        const sortedElements = visibleLargeElements.sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return (rectB.width * rectB.height) - (rectA.width * rectA.height);
        });
        
        if (sortedElements.length > 0) {
          element = sortedElements[0];
          logDebug('最終手段: サイズの大きな要素を発見しました', element);
        }
      }

      // 最終手段としてリアルタイムのDOM構造を探索
      if (!element) {
        logDebug('物理的なDOM要素を探索します');
        
        // メインメニューの明確なマーカー要素を探す
        // タイトルやボタンなど、特徴的な内容を持つ要素を探す
        const potentialParents = [];
        
        // タイトル要素を探す
        document.querySelectorAll('h1, h2, [class*="title"]').forEach(el => {
          const text = el.textContent.toLowerCase();
          if (text.includes('manaby typing') || text.includes('typing game') || text.includes('タイピングゲーム')) {
            // タイトルを含む要素の親要素を候補に追加
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
              const rect = parent.getBoundingClientRect();
              if (rect.width > 300 && rect.height > 300) {
                potentialParents.push(parent);
                break;
              }
              parent = parent.parentElement;
            }
          }
        });
        
        // ロゴ画像を探す
        document.querySelectorAll('img').forEach(el => {
          const src = el.src.toLowerCase();
          if (src.includes('logo') || src.includes('manaby') || src.includes('icon')) {
            let parent = el.parentElement;
            while (parent && parent !== document.body) {
              const rect = parent.getBoundingClientRect();
              if (rect.width > 300 && rect.height > 300) {
                potentialParents.push(parent);
                break;
              }
              parent = parent.parentElement;
            }
          }
        });
        
        if (potentialParents.length > 0) {
          // 最も大きな親要素を選ぶ
          const largestParent = potentialParents.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return (rectB.width * rectB.height) - (rectA.width * rectA.height);
          })[0];
          
          element = largestParent;
          logDebug('コンテンツマーカーから親要素を発見しました', element);
        }
      }
      
      // 最後の手段として、メインコンテナを使用
      if (!element) {
        element = getMainContainer();
        logDebug('内部要素は見つからなかったため、メインコンテナを使用します', element);
      }
      
      return element;
    } catch (error) {
      logError('内部背景要素の検索中にエラーが発生しました:', error);
      alert('内部背景要素の検出に問題が発生しました。別のキャプチャモードをお試しください。');
      throw new Error('内部背景要素の検出に失敗しました');
    }
  }, [selectedScreen, getMainContainer]);

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

  // キャプチャモードに対応する表示名を取得
  const getCaptureModeDisplayName = (mode) => {
    switch (mode) {
      case 'spa':
        return 'SPA画面全体';
      case 'container':
        return 'オレンジドット背景';
      case 'spa-background':
        return 'SPA内部背景';
      default:
        return mode;
    }
  };

  // 背景を保存する関数
  const captureAndSaveBackground = async () => {
    try {
      setIsSavingBackground(true);
      let targetElement;
      
      // キャプチャするターゲット要素を決定
      switch(captureMode) {
        case 'container':
          // 外側のコンテナ（レトロドットパターン背景）をキャプチャ
          if (backgroundRef?.current) {
            targetElement = backgroundRef.current;
            logDebug('外側ドット背景をキャプチャします:', targetElement);
          } else {
            throw new Error('外側ドット背景要素の参照が取得できません');
          }
          break;
          
        case 'spa-background':
          // SPA内部の背景要素のみをキャプチャ
          try {
            targetElement = getSpaBackgroundElement();
            logDebug('SPA内部背景をキャプチャします:', targetElement);
          } catch (err) {
            logError('SPA内部背景の取得に失敗しました:', err);
            alert(`現在の画面(${getScreenDisplayName(selectedScreen)})から内部背景を特定できませんでした。別の画面に切り替えるか、別のキャプチャモードを選択してください。`);
            throw err;
          }
          break;
          
        default:
          // 従来通りSPAのメインコンテナをキャプチャ
          targetElement = getMainContainer();
          logDebug('SPA画面全体をキャプチャします:', targetElement);
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
      const modeText = getCaptureModeDisplayName(captureMode);
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
      alert(`背景の保存に失敗しました: ${error.message}`);
    } finally {
      setIsSavingBackground(false);
    }
  };

  // 背景を適用する関数
  const applyBackground = (background) => {
    try {
      const captureMode = background.cssStyleInfo?.captureMode || 'spa';
      const targetScreen = background.screenId || 'ALL';
      const backgroundImageData = background.imageData;
      
      // 背景のキャプチャモードに応じた適用方法を選択
      switch(captureMode) {
        case 'container': 
          // 外側のドット背景に適用
          if (backgroundRef?.current) {
            // 背景コンポーネントのスタイルを直接変更
            const bgElement = backgroundRef.current;
            bgElement.style.backgroundImage = `url(${backgroundImageData})`;
            bgElement.style.backgroundSize = 'cover';
            bgElement.style.backgroundPosition = 'center';
            logDebug('外側ドット背景を適用しました');
          } else {
            throw new Error('外側ドット背景要素の参照が取得できません');
          }
          break;
          
        case 'spa-background':
          // SPA内部の背景に適用
          try {
            const internalElement = getSpaBackgroundElement();
            internalElement.style.backgroundImage = `url(${backgroundImageData})`;
            internalElement.style.backgroundSize = 'cover';
            internalElement.style.backgroundPosition = 'center';
            logDebug('SPA内部背景を適用しました');
          } catch (err) {
            throw new Error('SPA内部背景の適用に失敗しました。画面を切り替えてみてください。');
          }
          break;
          
        default:
          // 従来通りSPAのメインコンテナに適用
          const mainContainer = getMainContainer();
          mainContainer.style.backgroundImage = `url(${backgroundImageData})`;
          mainContainer.style.backgroundSize = 'cover';
          mainContainer.style.backgroundPosition = 'center';
          logDebug('SPA画面全体の背景を適用しました');
      }

      // CSSスタイル情報を適用（共通処理）
      const cssStyleInfo = background.cssStyleInfo || null;
      if (cssStyleInfo) {
        // スタイルを適用する対象を選択
        let targetElement;
        if (captureMode === 'container' && backgroundRef?.current) {
          targetElement = backgroundRef.current;
        } else if (captureMode === 'spa-background') {
          targetElement = getSpaBackgroundElement();
        } else {
          targetElement = getMainContainer();
        }
        
        // backgroundImage以外のスタイルを適用
        Object.entries(cssStyleInfo).forEach(([key, value]) => {
          if (key !== 'backgroundImage' && key !== 'captureMode') {
            targetElement.style[key] = value;
          }
        });
      }

      // localStorage に情報を保存
      try {
        // 管理者フラグと背景画像を保存
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem(`savedBackgroundImage_${captureMode}_${targetScreen}`, backgroundImageData);

        // スタイル情報も保存
        if (cssStyleInfo) {
          localStorage.setItem(`savedBackgroundStyle_${captureMode}_${targetScreen}`, JSON.stringify(cssStyleInfo));
        }

        // アクティブな背景情報を更新
        const activeBackgrounds = JSON.parse(localStorage.getItem('activeBackgrounds') || '{}');
        
        // captureMode別の情報を保存
        if (!activeBackgrounds[captureMode]) {
          activeBackgrounds[captureMode] = {};
        }
        
        activeBackgrounds[captureMode][targetScreen] = {
          id: background.id,
          timestamp: new Date().toISOString(),
        };
        
        localStorage.setItem('activeBackgrounds', JSON.stringify(activeBackgrounds));

        logDebug(`${getScreenDisplayName(targetScreen)}用の${getCaptureModeDisplayName(captureMode)}を適用しました`);
      } catch (storageError) {
        logError('背景情報をlocalStorageに保存できませんでした:', storageError);
      }

      // 保存した背景を適用したメッセージを表示
      showSuccessMessage(setShowRestoreSuccess);

    } catch (error) {
      logError('背景の適用中にエラーが発生しました:', error);
      alert(`背景の適用に失敗しました: ${error.message}`);
    }
  };

  // 背景をリセットして元に戻す関数
  const resetBackground = () => {
    try {
      // 全キャプチャモードをリセット（全ての背景をリセット）
      const captureModes = ['spa', 'container', 'spa-background'];
      
      captureModes.forEach(mode => {
        try {
          switch(mode) {
            case 'container':
              // 外側ドット背景のリセット
              if (backgroundRef?.current) {
                backgroundRef.current.style.backgroundImage = '';
                logDebug('外側ドット背景をリセットしました');
              }
              break;
              
            case 'spa-background':
              // SPA内部背景のリセット
              try {
                const internalElement = getSpaBackgroundElement();
                internalElement.style.backgroundImage = '';
                logDebug('SPA内部背景をリセットしました');
              } catch (err) {
                // 現在の画面にない場合は無視
                logDebug('SPA内部背景のリセットをスキップしました（要素が見つかりません）');
              }
              break;
              
            default:
              // SPA画面全体背景のリセット
              const mainContainer = getMainContainer();
              mainContainer.style.backgroundImage = '';
              logDebug('SPA画面全体の背景をリセットしました');
          }
          
          // localStorage から各モードの背景情報を削除
          localStorage.removeItem(`savedBackgroundImage_${mode}_${selectedScreen}`);
          localStorage.removeItem(`savedBackgroundStyle_${mode}_${selectedScreen}`);
          
          // アクティブ背景情報も更新
          const activeBackgrounds = JSON.parse(localStorage.getItem('activeBackgrounds') || '{}');
          if (activeBackgrounds[mode]) {
            delete activeBackgrounds[mode][selectedScreen];
          }
          localStorage.setItem('activeBackgrounds', JSON.stringify(activeBackgrounds));
          
        } catch (e) {
          logError(`${mode}モードの背景リセット中にエラーが発生しました:`, e);
        }
      });
      
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

  // ランキング削除関連の関数を追加
  // 指定した難易度のランキングを削除する関数
  const deleteRankingsByDifficulty = async () => {
    if (!window.confirm(`難易度「${getDifficultyDisplayName(selectedDifficulty)}」のランキングをすべて削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      setIsDeletingRankings(true);
      const success = await FirebaseUtils.deleteRankingsByDifficulty(selectedDifficulty);
      
      if (success) {
        logDebug(`難易度「${selectedDifficulty}」のランキングを削除しました`);
        showSuccessMessage(setShowDeleteSuccess);
      }
    } catch (error) {
      logError('ランキング削除中にエラーが発生しました:', error);
      alert(`ランキングの削除に失敗しました: ${error.message}`);
    } finally {
      setIsDeletingRankings(false);
    }
  };

  // すべてのランキングを削除する関数
  const deleteAllRankings = async () => {
    if (!window.confirm('すべての難易度のランキングを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      setIsDeletingRankings(true);
      const success = await FirebaseUtils.deleteAllRankings();
      
      if (success) {
        logDebug('すべてのランキングデータを削除しました');
        showSuccessMessage(setShowDeleteSuccess);
      }
    } catch (error) {
      logError('ランキング削除中にエラーが発生しました:', error);
      alert(`ランキングの削除に失敗しました: ${error.message}`);
    } finally {
      setIsDeletingRankings(false);
    }
  };

  // 難易度の表示名を取得する関数
  const getDifficultyDisplayName = (difficulty) => {
    const difficultyNames = {
      easy: 'かんたん',
      normal: 'ふつう',
      hard: 'むずかしい'
    };
    return difficultyNames[difficulty] || difficulty;
  };

  // 各種イベントハンドラー
  const handlePlayerNameChange = (e) => setPlayerName(e.target.value);
  const handleTabChange = (tab) => setActiveTab(tab);
  const handleScreenChange = (e) => setSelectedScreen(e.target.value);
  const handleCaptureModeChange = (mode) => setCaptureMode(mode);
  const handleDifficultyChange = (e) => setSelectedDifficulty(e.target.value);

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
          <button
            className={`${styles.adminPopup__tab} ${
              activeTab === 'rankings' ? styles['adminPopup__tab--active'] : ''
            }`}
            onClick={() => handleTabChange('rankings')}
          >
            ランキング
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
                  <label className={styles.adminPopup__radioLabel}>
                    <input
                      type="radio"
                      name="captureMode"
                      value="spa-background"
                      checked={captureMode === 'spa-background'}
                      onChange={() => handleCaptureModeChange('spa-background')}
                      className={styles.adminPopup__radio}
                    />
                    <span>SPA内部背景のみ</span>
                  </label>
                </div>
                <p className={styles.adminPopup__info}>
                  「SPA画面全体」：ゲーム画面を含むページ全体をキャプチャします。<br />
                  「オレンジドット背景のみ」：画面外側のドットパターン背景だけをキャプチャします。<br />
                  「SPA内部背景のみ」：ゲーム画面内の背景部分だけをキャプチャします。
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
                    : `${getCaptureModeDisplayName(captureMode)}を${getScreenDisplayName(
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
                  {getScreenDisplayName(selectedScreen)}の全背景をリセット
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
                          {getCaptureModeDisplayName(background.cssStyleInfo?.captureMode || 'spa')} |
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

          {/* 新しいランキング管理タブ */}
          {activeTab === 'rankings' && (
            <div className={styles.adminPopup__rankingManagement}>
              <h3 className={styles.adminPopup__subTitle}>
                ランキング管理
              </h3>

              <div className={styles.adminPopup__formGroup}>
                <label
                  className={styles.adminPopup__label}
                  htmlFor="difficultySelector"
                >
                  難易度を選択
                </label>
                <select
                  className={styles.adminPopup__select}
                  id="difficultySelector"
                  value={selectedDifficulty}
                  onChange={handleDifficultyChange}
                >
                  <option value="easy">かんたん</option>
                  <option value="normal">ふつう</option>
                  <option value="hard">むずかしい</option>
                </select>
                <p className={styles.adminPopup__info}>
                  削除する難易度を選択します。
                </p>
              </div>

              <div className={styles.adminPopup__buttonGroup}>
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--delete']}`}
                  onClick={deleteRankingsByDifficulty}
                  disabled={isDeletingRankings}
                >
                  {isDeletingRankings ? '削除中...' : `${getDifficultyDisplayName(selectedDifficulty)}のランキングを削除`}
                </button>
                
                <button
                  className={`${styles.adminPopup__button} ${styles['adminPopup__button--danger']}`}
                  onClick={deleteAllRankings}
                  disabled={isDeletingRankings}
                >
                  {isDeletingRankings ? '削除中...' : 'すべてのランキングを削除'}
                </button>
              </div>

              <div className={styles.adminPopup__warningBox}>
                <p className={styles.adminPopup__warning}>
                  <span className={styles.adminPopup__warningIcon}>⚠️</span>
                  注意: 削除したランキングデータは復元できません。
                </p>
              </div>

              {showDeleteSuccess && (
                <div className={styles.adminPopup__successMessage}>
                  <span className={styles.adminPopup__successIcon}>✓</span>{' '}
                  ランキングデータを削除しました！
                </div>
              )}
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
