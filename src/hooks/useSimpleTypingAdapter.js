import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import typingWorkerManager from '../utils/TypingWorkerManager';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_ADAPTER = process.env.NODE_ENV === 'development' && false;

/**
 * ログユーティリティ - コンソールログを条件付きにする
 */
const logUtil = {
  debug: (message, ...args) => {
    if (DEBUG_ADAPTER) console.log(message, ...args);
  },
  warn: (message, ...args) => {
    console.warn(message, ...args);
  },
  error: (message, ...args) => {
    console.error(message, ...args);
  },
};

/**
 * 既存のタイピングフックの出力をシンプル表示用に変換するアダプター（2025年5月9日改良版）
 * 複雑な状態を単純な表示用プロパティに変換する
 * Webワーカーキャッシュを活用して高速表示を実現
 *
 * @param {Object} typingHook 既存のuseTypingGame等のフックの戻り値
 * @returns {Object} SimpleTypingDisplayに必要なプロパティ
 */
export function useSimpleTypingAdapter(typingHook) {
  // 前回取得したローマ字を保持するref
  const lastValidRomaji = useRef('');

  // キャッシュ参照用のキー
  const sessionKeyRef = useRef('');

  // メモ化用の状態を管理
  const [adapterId] = useState(() =>
    Math.random().toString(36).substring(2, 9)
  );

  // 結果のキャッシュ
  const resultCacheRef = useRef({});

  // Webワーカーから直接データを取得
  const getWorkerData = useCallback(async (session) => {
    if (!session) return null;

    try {
      // セッションキーを生成
      const key = `${session.currentCharIndex || 0}_${
        session.currentInput || ''
      }_${session.completed ? 1 : 0}`;

      // キーが変わらなければキャッシュを使用
      if (key === sessionKeyRef.current && resultCacheRef.current.data) {
        return resultCacheRef.current.data;
      }

      // キーを更新
      sessionKeyRef.current = key;

      // 結果をワーカーから取得
      const result = await typingWorkerManager.getColoringInfo(session);

      // 結果を保存
      resultCacheRef.current = {
        key,
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (e) {
      logUtil.error('ワーカーデータ取得エラー:', e);
      return null;
    }
  }, []);

  // 次の期待されるキーを高速取得
  const getNextExpectedKey = useCallback(async (session) => {
    if (!session) return '';

    try {
      const result = await typingWorkerManager.getNextExpectedKey(session);
      return result?.key || '';
    } catch (e) {
      return '';
    }
  }, []);

  // フックが空の場合のデフォルト値
  if (!typingHook) {
    return {
      romaji: '',
      typedLength: 0,
      nextChar: '',
      isError: false,
      isCompleted: false,
      inputMode: 'normal',
      currentInput: '',
      currentCharRomaji: '',
      visiblePortion: { start: 0, end: 0 },
    };
  }

  // ワーカーから取得した情報を結果に統合
  useEffect(() => {
    if (!typingHook || !typingHook.typingSession) return;

    let isMounted = true;

    const updateWorkerData = async () => {
      const session = typingHook.typingSession;

      // セッションキーを更新
      const newKey = `${session.currentCharIndex || 0}_${
        session.currentInput || ''
      }_${session.completed ? 1 : 0}`;

      // すでに同じデータを処理中なら終了
      if (sessionKeyRef.current === newKey && resultCacheRef.current.data) {
        return;
      }

      try {
        // データ取得を最適化
        const optFast =
          typingWorkerManager.initialized &&
          !session.completed &&
          session.currentCharIndex !== undefined;

        // 高速パスを使用
        if (optFast) {
          const result = await getWorkerData(session);

          if (isMounted && result) {
            // ワーカーから取得したデータをメモ化結果に統合
            // この統合は自動的に次回のレンダリングに反映される
            resultCacheRef.current.data = result;
          }
        }
      } catch (e) {
        // エラーは無視（主要な表示機能には影響しない）
      }
    };

    // 非同期更新を実行
    updateWorkerData();

    // クリーンアップ
    return () => {
      isMounted = false;
    };
  }, [
    typingHook?.typingSession?.currentCharIndex,
    typingHook?.typingSession?.currentInput,
    typingHook?.typingSession?.completed,
    getWorkerData,
  ]);

  return useMemo(() => {
    try {
      // 安全にアクセスするためのヘルパー関数
      const safeGet = (obj, path, defaultValue) => {
        if (!obj) return defaultValue;
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current[key] === undefined || current[key] === null) {
            return defaultValue;
          }
          current = current[key];
        }
        return current;
      };

      // ワーカーからキャッシュされたデータを優先使用
      const workerCachedData = resultCacheRef.current.data;

      // まず、coloringInfoから必要な情報を抽出
      const displayInfo = safeGet(typingHook, 'displayInfo', {});
      const coloringInfo =
        safeGet(typingHook, 'coloringInfo', {}) || workerCachedData || {};

      // typedLengthを正確に取得（複数の場所から試みる）
      // 優先順位: ワーカーキャッシュ > coloringInfo > displayInfo > 直接参照
      let typedLength = 0;
      if (workerCachedData && workerCachedData.typedLength !== undefined) {
        typedLength = workerCachedData.typedLength;
      } else if (coloringInfo && coloringInfo.typedLength !== undefined) {
        typedLength = coloringInfo.typedLength;
      } else if (displayInfo && displayInfo.typedLength !== undefined) {
        typedLength = displayInfo.typedLength;
      } else if (
        safeGet(typingHook, 'typingSession.typedLength', null) !== null
      ) {
        typedLength = safeGet(typingHook, 'typingSession.typedLength', 0);
      }

      // 各種情報も同じ方法で取得
      let nextChar = '';
      if (workerCachedData && workerCachedData.expectedNextChar) {
        nextChar = workerCachedData.expectedNextChar;
      } else if (coloringInfo && coloringInfo.expectedNextChar) {
        nextChar = coloringInfo.expectedNextChar;
      } else if (displayInfo && displayInfo.expectedNextChar) {
        nextChar = displayInfo.expectedNextChar;
      } else if (
        safeGet(typingHook, 'typingSession.expectedNextChar', null) !== null
      ) {
        nextChar = safeGet(typingHook, 'typingSession.expectedNextChar', '');
      }

      // 現在の入力
      const currentInput =
        safeGet(workerCachedData, 'currentInput', '') ||
        safeGet(coloringInfo, 'currentInput', '') ||
        safeGet(displayInfo, 'currentInput', '') ||
        safeGet(typingHook, 'typingSession.currentInput', '');

      // 現在入力中の文字の完全なローマ字表現
      const currentCharRomaji =
        safeGet(workerCachedData, 'currentCharRomaji', '') ||
        safeGet(coloringInfo, 'currentCharRomaji', '') ||
        safeGet(displayInfo, 'currentCharRomaji', '') ||
        safeGet(typingHook, 'typingSession.currentCharRomaji', '');

      // romajiの取得方法を多様化 - typingHookの複数の場所から試みる
      let romaji = '';
      // 保存されたローマ字の参照
      let originalRomaji = '';

      // 1. セッションから直接取得を試みる
      const session = safeGet(typingHook, 'typingSession', null);
      if (session && session.displayRomaji) {
        romaji = session.displayRomaji;
        originalRomaji = romaji; // オリジナルをバックアップ
      }
      // 2. displayInfoから取得を試みる
      else if (safeGet(typingHook, 'displayInfo.romaji', '')) {
        romaji = safeGet(typingHook, 'displayInfo.romaji', '');
        originalRomaji = romaji; // オリジナルをバックアップ
      }
      // 3. MCPサーバーを使用している場合の処理
      else if (safeGet(typingHook, 'mcpSession.romaji', '')) {
        romaji = safeGet(typingHook, 'mcpSession.romaji', '');
        originalRomaji = romaji; // オリジナルをバックアップ
      }
      // 4. 従来の場所から取得を試みる
      else {
        romaji = safeGet(typingHook, 'displayRomaji', '');
        originalRomaji = romaji; // オリジナルをバックアップ
      }

      // displayRomajiの末尾の'|'を削除（存在する場合）
      if (romaji && romaji.endsWith('|')) {
        romaji = romaji.slice(0, -1);
      }

      // 改行やスペースを適切に処理
      if (romaji) {
        romaji = romaji.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
      }

      // *** ローマ字が空の場合に適切な処理を行う ***
      if (!romaji || romaji.trim() === '') {
        // 前回有効だったローマ字があれば、それを使用
        if (lastValidRomaji.current) {
          logUtil.debug(
            `[useSimpleTypingAdapter] ローマ字が空のため、前回の有効なローマ字を使用: ${lastValidRomaji.current}`
          );
          romaji = lastValidRomaji.current;
        } else {
          // バックアップとして"問題の原文"からローマ字を再構築することを試みる
          // 問題テキストをバックアップとして使用
          const problemText =
            safeGet(typingHook, 'problem.text', '') ||
            safeGet(typingHook, 'currentProblem.text', '') ||
            safeGet(displayInfo, 'problem', '');

          // 問題テキストがあれば、ローマ字辞書からの変換も試みる
          if (problemText) {
            logUtil.debug(
              '[useSimpleTypingAdapter] ローマ字の再構築を試みます:',
              problemText
            );
            romaji = originalRomaji || problemText; // 少なくとも何かを表示
          }
        }
      } else {
        // 有効なローマ字を保存
        lastValidRomaji.current = romaji;
      }

      // 非表示部分の削除（ローマ字の長さによっては表示領域が限られる）
      // 表示可能な部分の範囲を計算
      let visibleStart = 0;
      let visibleEnd = romaji ? romaji.length : 0;

      // typedLengthから表示範囲を計算
      // 入力位置の前後に一定数の文字を表示する
      const contextSize = 30; // 入力位置の前後に表示する文字数

      if (romaji && romaji.length > contextSize * 2) {
        visibleStart = Math.max(0, typedLength - contextSize);
        visibleEnd = Math.min(
          romaji.length,
          typedLength + contextSize + (nextChar?.length || 1)
        );
      }

      // 範囲内に次の文字が確実に含まれるよう調整
      if (nextChar && romaji && typedLength + nextChar.length > visibleEnd) {
        visibleEnd = typedLength + nextChar.length;
      }

      // デバッグ情報
      if (DEBUG_ADAPTER) {
        logUtil.debug('【useSimpleTypingAdapter】データ取得結果:', {
          adapterId, // アダプターの一意識別子
          romaji: romaji || '<空文字>',
          typedLength,
          nextChar: nextChar || '<なし>',
          currentInput: currentInput || '<なし>',
          currentCharRomaji: currentCharRomaji || '<なし>',
          visibleRange: romaji
            ? `${visibleStart}-${visibleEnd} (${romaji.length}文字中)`
            : 'なし',
          lastValidRomaji: lastValidRomaji.current || '<なし>',
          usingWorkerData: !!workerCachedData,
          sessionKey: sessionKeyRef.current,
        });
      }

      // 入力モードを取得（子音入力中かどうか）
      const typingSession = safeGet(typingHook, 'typingSession', {});
      const consonantInput = safeGet(typingSession, 'consonantInput', false);

      // 子音入力中の処理
      let inputMode = 'normal';

      // 子音入力中かどうかを判定する複数の条件
      if (
        // 1. タイピングセッションが明示的に子音入力中であると示している場合
        consonantInput ||
        // 2. 現在の入力が子音のみであり、かつその後に続く文字がある場合
        (currentInput &&
          isConsonant(currentInput) &&
          currentCharRomaji &&
          currentCharRomaji.length > currentInput.length) ||
        // 3. 現在の文字の完全なローマ字表現が存在し、それが入力よりも長い場合（子音入力の途中である）
        (currentCharRomaji &&
          currentInput &&
          currentCharRomaji.length > currentInput.length)
      ) {
        inputMode = 'consonant';
      }

      // 取得したパターンに対応する可能な次の母音のリスト
      const possibleFollowingVowels =
        inputMode === 'consonant' && currentInput
          ? getPossibleVowels(currentInput)
          : [];

      // 表示用の情報を作成
      return {
        romaji,
        typedLength,
        nextChar,
        isError: safeGet(typingHook, 'errorAnimation', false),
        isCompleted: safeGet(typingHook, 'isCompleted', false),
        inputMode,
        currentInput,
        currentCharRomaji,
        visiblePortion: {
          start: visibleStart,
          end: visibleEnd,
        },
        // パフォーマンス最適化用のフラグ
        usingWorkerData: !!workerCachedData,
        adapterId,

        // 子音入力サポート
        possibleFollowingVowels,

        // オリジナルのフックのプロパティをパススルー（必要に応じて使用）
        originalHook: typingHook,

        // デバッグ情報
        debug: DEBUG_ADAPTER
          ? {
              coloringInfo,
              displayInfo,
              workerCachedData,
              sessionKey: sessionKeyRef.current,
            }
          : undefined,
      };
    } catch (error) {
      logUtil.error('useSimpleTypingAdapter エラー:', error);
      // エラーが発生した場合でもクラッシュせずデフォルト値を返す
      return {
        romaji: lastValidRomaji.current || '',
        typedLength: 0,
        nextChar: '',
        isError: false,
        isCompleted: false,
        inputMode: 'normal',
        currentInput: '',
        currentCharRomaji: '',
        visiblePortion: { start: 0, end: 0 },
        adapterId,
        usingWorkerData: false,
      };
    }
  }, [
    adapterId,
    typingHook?.displayRomaji,
    typingHook?.displayInfo?.romaji,
    typingHook?.mcpSession?.romaji,
    typingHook?.typingSession?.displayRomaji,
    typingHook?.coloringInfo,
    typingHook?.displayInfo,
    typingHook?.errorAnimation,
    typingHook?.isCompleted,
    typingHook?.typingSession?.currentInput,
    typingHook?.typingSession?.typedLength,
    typingHook?.typingSession?.consonantInput,
    typingHook?.problem?.text,
    typingHook?.currentProblem?.text,
    // ワーカーからのデータ依存性
    resultCacheRef.current.data,
  ]);
}

/**
 * 入力された文字が子音かどうかを判断する
 * @param {string} char 判定する文字
 * @returns {boolean} 子音ならtrue
 */
function isConsonant(char) {
  if (!char || char.length === 0) return false;
  // 日本語ローマ字入力で使われる子音
  const consonants = [
    'b',
    'c',
    'd',
    'f',
    'g',
    'h',
    'j',
    'k',
    'm',
    'n',
    'p',
    'q',
    'r',
    's',
    't',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];
  return consonants.includes(char.toLowerCase().charAt(0));
}

/**
 * 子音に続く可能な母音を返す
 * @param {string} consonant 子音
 * @returns {string[]} 可能な母音リスト
 */
function getPossibleVowels(consonant) {
  if (!consonant || consonant.length === 0) return ['a', 'i', 'u', 'e', 'o'];

  // 一般的な子音に対応する可能な母音
  const vowelMap = {
    k: ['a', 'i', 'u', 'e', 'o', 'y'],
    g: ['a', 'i', 'u', 'e', 'o', 'y'],
    s: ['a', 'i', 'u', 'e', 'o', 'h'],
    z: ['a', 'i', 'u', 'e', 'o'],
    t: ['a', 'i', 'u', 'e', 'o', 's'],
    d: ['a', 'i', 'u', 'e', 'o'],
    n: ['a', 'i', 'u', 'e', 'o'],
    h: ['a', 'i', 'u', 'e', 'o', 'y'],
    f: ['a', 'i', 'u', 'e', 'o'],
    b: ['a', 'i', 'u', 'e', 'o', 'y'],
    p: ['a', 'i', 'u', 'e', 'o', 'y'],
    m: ['a', 'i', 'u', 'e', 'o'],
    y: ['a', 'u', 'o'],
    r: ['a', 'i', 'u', 'e', 'o', 'y'],
    w: ['a', 'i', 'e', 'o'],
    v: ['a', 'i', 'u', 'e', 'o'],
    c: ['a', 'i', 'u', 'e', 'o', 'h'],
    j: ['a', 'i', 'u', 'e', 'o'],
    q: ['a', 'i', 'u', 'e', 'o'],
    x: ['a', 'i', 'u', 'e', 'o'],
  };

  const c = consonant.toLowerCase().charAt(0);
  return vowelMap[c] || ['a', 'i', 'u', 'e', 'o'];
}

/**
 * Webワーカーから次の期待キーを取得するためのヘルパーフック
 * 超高速でキーボードハイライト機能のためのキー情報を提供
 */
export function useNextExpectedKey(typingHook) {
  const [nextKey, setNextKey] = useState('');

  useEffect(() => {
    if (!typingHook || !typingHook.typingSession) return;

    let isMounted = true;
    let timeoutId = null;

    const fetchNextKey = async () => {
      try {
        // 完了状態ならスキップ
        if (typingHook.typingSession.completed) {
          if (isMounted) setNextKey('');
          return;
        }

        // ワーカーから次のキーを取得
        const result = await typingWorkerManager.getNextExpectedKey(
          typingHook.typingSession
        );

        if (isMounted && result && result.key) {
          setNextKey(result.key);
        }
      } catch (e) {
        // タイピングセッションから直接取得（フォールバック）
        if (isMounted && typingHook.typingSession.getCurrentExpectedKey) {
          const key = typingHook.typingSession.getCurrentExpectedKey();
          if (key) setNextKey(key);
        }
      }

      // 60Hz（約16.7ms）でポーリング - メインスレッドのパフォーマンスに影響しない頻度
      if (isMounted) {
        timeoutId = setTimeout(fetchNextKey, 50);
      }
    };

    fetchNextKey();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    typingHook?.typingSession?.currentCharIndex,
    typingHook?.typingSession?.currentInput,
  ]);

  return nextKey;
}
