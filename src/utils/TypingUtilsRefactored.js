'use client';

/**
 * TypingUtils.js (リファクタリング版)
 * タイピング機能のファサードクラスとユーティリティ関数
 * 責任: 下位モジュールへのアクセスを統一するファサード
 */

import * as wanakana from 'wanakana';
import { romajiConverter } from './typing/RomajiConverter';
import { typingSessionFactory } from './typing/TypingSessionFactory';

/**
 * タイピングユーティリティクラス
 * リファクタリング後のファサードパターン実装
 */
class TypingUtilsRefactored {
  /**
   * タイピングセッションを作成する
   * @param {Object} problem - 問題オブジェクト
   * @returns {Object} タイピングセッションオブジェクト
   */
  createTypingSession(problem) {
    return typingSessionFactory.createSession(problem);
  }

  /**
   * かな文字列をローマ字入力パターンに変換
   * @param {string} hiragana - かな文字列
   * @returns {Array} ローマ字入力パターンの配列
   */
  parseTextToRomajiPatterns(hiragana) {
    return romajiConverter.parseTextToRomajiPatterns(hiragana);
  }

  /**
   * KPMランクを取得
   * @param {number} kpm - 1分あたりのキー入力数
   * @returns {string} ランク文字列
   */
  getRank(kpm) {
    return typingSessionFactory.calculateRank(kpm);
  }

  /**
   * 問題統計から平均KPMを計算
   * @param {Array} problemStats - 問題統計データ配列
   * @returns {number} 平均KPM
   */
  calculateAverageKPM(problemStats) {
    return typingSessionFactory.calculateAverageKPM(problemStats);
  }

  /**
   * 統計情報からスコアを計算
   * @param {Object} stats - 統計情報
   * @returns {number} 計算されたスコア
   */
  calculateScore(stats) {
    return typingSessionFactory.calculateScore(stats);
  }

  /**
   * ひらがな→ローマ字変換（単純な文字列変換）
   * @param {string} hiragana - ひらがな文字列
   * @returns {string} ローマ字文字列
   */
  hiraganaToRomaji(hiragana) {
    const patterns = this.parseTextToRomajiPatterns(hiragana);
    return romajiConverter.generateRomajiFromPatterns(patterns);
  }

  /**
   * テキスト正規化
   * @param {string} text - 入力テキスト
   * @returns {string} 正規化されたテキスト
   */
  normalizeText(text) {
    if (!text) return '';

    // 全角カタカナ・ひらがな以外の文字は除外
    const normalized = text
      .replace(/[^\u3040-\u309F\u30A0-\u30FF]/g, '') // ひらがな・カタカナのみ残す
      .trim();

    // カタカナ→ひらがな変換
    return wanakana.toHiragana(normalized);
  }

  /**
   * テキストを単語に分割
   * @param {string} text - 入力テキスト
   * @returns {Array} 単語の配列
   */
  splitIntoWords(text) {
    if (!text) return [];

    // 空白で分割し、空の要素を削除
    return text.split(/\s+/).filter(Boolean);
  }
}

// エクスポートするインスタンス
const typingUtils = new TypingUtilsRefactored();
export default typingUtils;

// 下位モジュールも直接エクスポート
export { romajiConverter } from './typing/RomajiConverter';
export { typingSessionFactory } from './typing/TypingSessionFactory';
export { TypingSession } from './typing/TypingSession';
