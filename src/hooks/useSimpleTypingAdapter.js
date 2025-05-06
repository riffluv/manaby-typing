import { useMemo } from 'react';

/**
 * 既存のタイピングフックの出力をシンプル表示用に変換するアダプター
 * 複雑な状態を単純な表示用プロパティに変換する
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

      // 既存のcoloringInfoから必要な情報を抽出
      const coloringInfo = safeGet(typingHook, 'coloringInfo', {});
      const typedLength = safeGet(coloringInfo, 'typedLength', 0);
      let nextChar = safeGet(coloringInfo, 'expectedNextChar', '');
      const currentInput = safeGet(coloringInfo, 'currentInput', '');
      const currentCharRomaji = safeGet(coloringInfo, 'currentCharRomaji', '');
      
      // displayRomajiの末尾の'|'を削除（存在する場合）
      let romaji = safeGet(typingHook, 'displayRomaji', '');
      if (romaji && romaji.endsWith('|')) {
        romaji = romaji.slice(0, -1);
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
        currentCharRomaji, // 現在入力中の文字の完全なローマ字表現を追加
        
        // オリジナルのフックのプロパティをパススルー（必要に応じて使用）
        originalHook: typingHook,
        coloringInfo // 元のcoloringInfoも含める（デバッグに便利）
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
      };
    }
  }, [
    typingHook?.displayRomaji,
    typingHook?.coloringInfo,
    typingHook?.errorAnimation,
    typingHook?.isCompleted,
    typingHook?.typingSession?.currentInput,
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