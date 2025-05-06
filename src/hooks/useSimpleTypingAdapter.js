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
      isCompleted: false
    };
  }

  return useMemo(() => {
    // 既存のcoloringInfoから必要な情報を抽出
    const coloringInfo = typingHook.coloringInfo || {};
    const typedLength = coloringInfo.typedLength || 0;
    const nextChar = coloringInfo.expectedNextChar || '';

    // displayRomajiの末尾の'|'を削除（存在する場合）
    const romaji = typingHook.displayRomaji && typingHook.displayRomaji.endsWith('|')
      ? typingHook.displayRomaji.slice(0, -1)
      : typingHook.displayRomaji || '';

    return {
      romaji,
      typedLength,
      nextChar,
      isError: typingHook.errorAnimation || false,
      isCompleted: typingHook.isCompleted || false,

      // オリジナルのフックのプロパティをパススルー（必要に応じて使用）
      originalHook: typingHook
    };
  }, [
    typingHook.displayRomaji,
    typingHook.coloringInfo,
    typingHook.errorAnimation,
    typingHook.isCompleted
  ]);
}