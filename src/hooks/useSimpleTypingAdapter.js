import { useMemo } from 'react';

/**
 * 既存のタイピングフックの出力をシンプル表示用に変換するアダプター（改良版）
 * 複雑な状態を単純な表示用プロパティに変換する
 * 長いローマ字や改行が発生するケースにも適切に対応
 * 
 * @param {Object} typingHook 既存のuseTypingGame等のフックの戻り値
 * @returns {Object} SimpleTypingDisplayに必要なプロパティ
 */
export function useSimpleTypingAdapter(typingHook) {
  // フックが空の場合のデフォルト値
  if (!typingHook) {
    return {
      romaji: '',
      typedLength: 0,
      nextChar: '',
      isError: false,
      isCompleted: false,
      inputMode: 'normal', // 入力モード (normal/consonant)
      currentInput: '',
      currentCharRomaji: '', // 現在入力中の文字の完全なローマ字表現
      visiblePortion: { start: 0, end: 0 }, // 表示可能な部分の範囲
    };
  }

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

      // まず、coloringInfoから必要な情報を抽出
      const displayInfo = safeGet(typingHook, 'displayInfo', {});
      const coloringInfo = safeGet(typingHook, 'coloringInfo', {});

      // typedLengthを正確に取得（複数の場所から試みる）
      // 優先順位: coloringInfo > displayInfo > 直接参照
      let typedLength = 0;
      if (coloringInfo && coloringInfo.typedLength !== undefined) {
        typedLength = coloringInfo.typedLength;
      } else if (displayInfo && displayInfo.typedLength !== undefined) {
        typedLength = displayInfo.typedLength;
      } else if (safeGet(typingHook, 'typingSession.typedLength', null) !== null) {
        typedLength = safeGet(typingHook, 'typingSession.typedLength', 0);
      }

      // 各種情報も同じ方法で取得
      let nextChar = '';
      if (coloringInfo && coloringInfo.expectedNextChar) {
        nextChar = coloringInfo.expectedNextChar;
      } else if (displayInfo && displayInfo.expectedNextChar) {
        nextChar = displayInfo.expectedNextChar;
      } else if (safeGet(typingHook, 'typingSession.expectedNextChar', null) !== null) {
        nextChar = safeGet(typingHook, 'typingSession.expectedNextChar', '');
      }

      // 現在の入力
      const currentInput = safeGet(coloringInfo, 'currentInput', '') ||
        safeGet(displayInfo, 'currentInput', '') ||
        safeGet(typingHook, 'typingSession.currentInput', '');

      // 現在入力中の文字の完全なローマ字表現
      const currentCharRomaji = safeGet(coloringInfo, 'currentCharRomaji', '') ||
        safeGet(displayInfo, 'currentCharRomaji', '') ||
        safeGet(typingHook, 'typingSession.currentCharRomaji', '');

      // romajiの取得方法を多様化 - typingHookの複数の場所から試みる
      let romaji = '';

      // 1. セッションから直接取得を試みる
      const session = safeGet(typingHook, 'typingSession', null);
      if (session && session.displayRomaji) {
        romaji = session.displayRomaji;
      }
      // 2. displayInfoから取得を試みる
      else if (safeGet(typingHook, 'displayInfo.romaji', '')) {
        romaji = safeGet(typingHook, 'displayInfo.romaji', '');
      }
      // 3. MCPサーバーを使用している場合の処理
      else if (safeGet(typingHook, 'mcpSession.romaji', '')) {
        romaji = safeGet(typingHook, 'mcpSession.romaji', '');
      }
      // 4. 従来の場所から取得を試みる
      else {
        romaji = safeGet(typingHook, 'displayRomaji', '');
      }

      // displayRomajiの末尾の'|'を削除（存在する場合）
      if (romaji && romaji.endsWith('|')) {
        romaji = romaji.slice(0, -1);
      }

      // 改行やスペースを適切に処理
      romaji = romaji.replace(/\r\n/g, ' ').replace(/\n/g, ' ');

      // 非表示部分の削除（ローマ字の長さによっては表示領域が限られる）
      // 表示可能な部分の範囲を計算
      let visibleStart = 0;
      let visibleEnd = romaji.length;

      // typedLengthから表示範囲を計算
      // 入力位置の前後に一定数の文字を表示する
      const contextSize = 30; // 入力位置の前後に表示する文字数

      if (romaji.length > contextSize * 2) {
        visibleStart = Math.max(0, typedLength - contextSize);
        visibleEnd = Math.min(romaji.length, typedLength + contextSize + (nextChar?.length || 1));
      }

      // 範囲内に次の文字が確実に含まれるよう調整
      if (nextChar && typedLength + nextChar.length > visibleEnd) {
        visibleEnd = typedLength + nextChar.length;
      }

      // デバッグ情報
      if (process.env.NODE_ENV === 'development') {
        console.log('【useSimpleTypingAdapter】データ取得結果:', {
          romaji: romaji || '<空文字>',
          typedLength,
          nextChar: nextChar || '<なし>',
          currentInput: currentInput || '<なし>',
          currentCharRomaji: currentCharRomaji || '<なし>',
          visibleRange: `${visibleStart}-${visibleEnd} (${romaji.length}文字中)`,
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
        (currentInput && isConsonant(currentInput) && currentCharRomaji.length > currentInput.length) ||
        // 3. 現在の文字の完全なローマ字表現が存在し、それが入力よりも長い場合（子音入力の途中である）
        (currentCharRomaji && currentInput && currentCharRomaji.length > currentInput.length)
      ) {
        inputMode = 'consonant';
      }

      // 表示用の情報を作成
      return {
        romaji,
        typedLength,
        nextChar,
        isError: safeGet(typingHook, 'errorAnimation', false),
        isCompleted: safeGet(typingHook, 'isCompleted', false),
        inputMode,
        currentInput,
        currentCharRomaji, // 現在入力中の文字の完全なローマ字表現
        visiblePortion: { // 表示可能な部分の範囲
          start: visibleStart,
          end: visibleEnd
        },

        // オリジナルのフックのプロパティをパススルー（必要に応じて使用）
        originalHook: typingHook,
        coloringInfo, // 元のcoloringInfoも含める（デバッグに便利）
        displayInfo // displayInfoも含める
      };
    } catch (error) {
      console.error('useSimpleTypingAdapter エラー:', error);
      // エラーが発生した場合でもクラッシュせずデフォルト値を返す
      return {
        romaji: '',
        typedLength: 0,
        nextChar: '',
        isError: false,
        isCompleted: false,
        inputMode: 'normal',
        currentInput: '',
        currentCharRomaji: '',
        visiblePortion: { start: 0, end: 0 }
      };
    }
  }, [
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
    typingHook?.typingSession?.consonantInput
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
  const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];
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
    'k': ['a', 'i', 'u', 'e', 'o', 'y'],
    'g': ['a', 'i', 'u', 'e', 'o', 'y'],
    's': ['a', 'i', 'u', 'e', 'o', 'h'],
    'z': ['a', 'i', 'u', 'e', 'o'],
    't': ['a', 'i', 'u', 'e', 'o', 's'],
    'd': ['a', 'i', 'u', 'e', 'o'],
    'n': ['a', 'i', 'u', 'e', 'o'],
    'h': ['a', 'i', 'u', 'e', 'o', 'y'],
    'f': ['a', 'i', 'u', 'e', 'o'],
    'b': ['a', 'i', 'u', 'e', 'o', 'y'],
    'p': ['a', 'i', 'u', 'e', 'o', 'y'],
    'm': ['a', 'i', 'u', 'e', 'o'],
    'y': ['a', 'u', 'o'],
    'r': ['a', 'i', 'u', 'e', 'o', 'y'],
    'w': ['a', 'i', 'e', 'o'],
    'v': ['a', 'i', 'u', 'e', 'o'],
    'c': ['a', 'i', 'u', 'e', 'o', 'h'],
    'j': ['a', 'i', 'u', 'e', 'o'],
    'q': ['a', 'i', 'u', 'e', 'o'],
    'x': ['a', 'i', 'u', 'e', 'o']
  };

  const c = consonant.toLowerCase().charAt(0);
  return vowelMap[c] || ['a', 'i', 'u', 'e', 'o'];
}