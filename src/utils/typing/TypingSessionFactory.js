'use client';

/**
 * TypingSessionFactory.js
 * タイピングセッションを生成・管理するファクトリークラス
 * 責任: セッションの作成、共通設定の適用
 */

import * as wanakana from 'wanakana';
import { TypingSession } from './TypingSession';
import { romajiConverter } from './RomajiConverter';

/**
 * タイピングセッションファクトリークラス
 * セッションの作成と共通設定の適用を担当
 */
export class TypingSessionFactory {
  /**
   * 問題データからタイピングセッションを作成
   * @param {Object} problem - 問題データ
   * @returns {TypingSession|null} 作成されたセッション
   */
  createSession(problem) {
    if (!problem || !problem.kanaText) {
      console.error('[TypingSessionFactory] 有効な問題データが必要です');
      return null;
    }

    try {
      // かな文字列を正規化
      const kana = wanakana.toHiragana(problem.kanaText.trim());

      // ローマ字パターンに変換
      const patterns = romajiConverter.parseTextToRomajiPatterns(kana);

      // 表示用情報と最適化データを事前計算
      const displayIndices = new Array(patterns.length);
      const patternLengths = new Array(patterns.length);
      const expectedChars = new Array(patterns.length);
      const firstChars = new Array(patterns.length); // 最初の文字を事前計算

      // パターン情報をキャッシュして高速化
      for (let i = 0; i < patterns.length; i++) {
        displayIndices[i] = i;
        patternLengths[i] = patterns[i][0].length;

        // 最初の入力文字をキャッシュ
        firstChars[i] = patterns[i][0].charAt(0);

        // 期待される入力キーの配列
        expectedChars[i] = [];
        for (let variant of patterns[i]) {
          for (let j = 0; j < variant.length; j++) {
            if (!expectedChars[i][j]) {
              expectedChars[i][j] = [];
            }
            expectedChars[i][j].push(variant.charAt(j));
          }
        }
      }

      // 新しいセッションを作成
      return new TypingSession({
        problem,
        patterns,
        displayIndices,
        patternLengths,
        expectedChars,
        firstChars,
        kana,
        displayText: problem.displayText || problem.kanaText,
        originalText: problem.kanaText,
      });
    } catch (error) {
      console.error('[TypingSessionFactory] セッション作成エラー:', error);
      return null;
    }
  }

  /**
   * KPMランクを計算
   * @param {number} kpm - 1分あたりのキー入力数
   * @returns {string} ランク文字列（S, A, B, C, D, E, F）
   */
  calculateRank(kpm) {
    if (kpm >= 400) return 'S+';
    if (kpm >= 350) return 'S';
    if (kpm >= 300) return 'A+';
    if (kpm >= 250) return 'A';
    if (kpm >= 200) return 'B+';
    if (kpm >= 150) return 'B';
    if (kpm >= 100) return 'C';
    if (kpm >= 50) return 'D';
    return 'F';
  }

  /**
   * 問題統計データから平均KPMを計算
   * @param {Array} problemStats - 問題統計データの配列
   * @returns {number} 平均KPM
   */
  calculateAverageKPM(problemStats) {
    if (!problemStats || problemStats.length === 0) {
      return 0;
    }

    // 各問題のKPMの合計
    const totalKPM = problemStats.reduce((sum, problem) => {
      return sum + (problem.problemKPM || 0);
    }, 0);

    // 平均KPMを計算
    return Math.floor(totalKPM / problemStats.length);
  }

  /**
   * 総合スコアを計算
   * @param {Object} stats - 統計情報
   * @returns {number} 計算されたスコア
   */
  calculateScore(stats) {
    const {
      correctKeyCount = 0,
      mistakeCount = 0,
      kpm = 0,
    } = stats;

    // ミス率を計算（0～1の範囲）
    const totalKeyStrokes = correctKeyCount + mistakeCount;
    const missRate = totalKeyStrokes > 0 ? mistakeCount / totalKeyStrokes : 0;

    // ミス率に基づくペナルティ係数（0.5～1.0の範囲）
    const accuracyFactor = 1.0 - (missRate * 0.5);

    // KPMとアキュラシーに基づいてスコア算出
    let baseScore = kpm * 10;
    let finalScore = Math.floor(baseScore * accuracyFactor);

    // 最低スコア保証
    if (finalScore < 0) finalScore = 0;

    return finalScore;
  }
}

// シングルトンインスタンス
export const typingSessionFactory = new TypingSessionFactory();
