'use client';

/**
 * TypingSession.js
 * タイピングセッションのコアロジックを実装するクラス
 * 責任: 単一のタイピングセッションのライフサイクル管理
 */

import * as wanakana from 'wanakana';

/**
 * タイピングセッションクラス
 * 1つの問題に対するタイピング入力処理を管理
 */
export class TypingSession {
  /**
   * コンストラクタ
   * @param {Object} options セッション設定オプション
   */
  constructor(options = {}) {
    const {
      problem,
      patterns = [],
      displayIndices = [],
      patternLengths = [],
      expectedChars = [],
      firstChars = [],
      kana = '',
      displayText = '',
      originalText = '',
    } = options;

    // 問題情報
    this.problem = problem;
    this.kana = kana;
    this.displayText = displayText;
    this.originalText = originalText;

    // 入力処理用データ
    this.patterns = patterns;
    this.displayIndices = displayIndices;
    this.patternLengths = patternLengths;
    this.expectedChars = expectedChars;
    this.firstChars = firstChars;

    // 状態管理
    this.currentCharIndex = 0;
    this.currentInput = '';
    this.typedString = '';
    this.patternIndex = 0;
    this.completionStatus = {
      completed: false,
      patternProgress: 0,
      totalProgress: 0,
    };

    // 表示用ローマ字
    this.displayRomaji = this._generateDisplayRomaji();

    // パフォーマンス測定用
    this._perfData = {
      lastProcessTime: 0,
      averageProcessTime: 0,
      processCount: 0,
    };
  }

  /**
   * 表示用ローマ字文字列を生成
   * @returns {string} 表示用ローマ字文字列
   * @private
   */
  _generateDisplayRomaji() {
    return this.patterns.map(pattern => pattern[0]).join('');
  }

  /**
   * 入力を処理する
   * @param {string} key - 入力キー
   * @returns {Object} 処理結果
   */
  processInput(key) {
    // パフォーマンス計測開始
    const startTime = performance.now();

    try {
      // 完了している場合は何もしない
      if (this.completionStatus.completed) {
        return {
          success: false,
          status: 'already_completed',
        };
      }

      // 現在のパターン
      const currentPattern = this.patterns[this.patternIndex];
      if (!currentPattern) {
        return {
          success: false,
          status: 'invalid_pattern',
        };
      }

      // 現在の入力と期待する入力を比較
      const expectedNextChar = this.getCurrentExpectedKey();

      // 入力が正しいかチェック
      if (key.toLowerCase() === expectedNextChar.toLowerCase()) {
        // 正しい入力の処理
        this.currentInput += key.toLowerCase();
        this.typedString += key.toLowerCase();

        // パターン完了チェック
        const patternLength = this.patternLengths[this.patternIndex];
        if (this.currentInput.length >= patternLength) {
          // パターン完了
          this.patternIndex++;
          this.currentCharIndex++;
          this.currentInput = '';

          // 全体完了チェック
          if (this.patternIndex >= this.patterns.length) {
            this.completionStatus = {
              completed: true,
              patternProgress: 100,
              totalProgress: 100,
            };

            return {
              success: true,
              status: 'all_completed',
            };
          }
        }

        // 進捗状況の更新
        this._updateProgress();

        return {
          success: true,
          status: 'input_accepted',
          progress: this.completionStatus.totalProgress,
        };
      } else {
        // 誤った入力の処理
        return {
          success: false,
          status: 'wrong_input',
          expectedChar: expectedNextChar,
        };
      }
    } finally {
      // パフォーマンス測定終了
      const endTime = performance.now();
      const processTime = endTime - startTime;

      // パフォーマンスデータ更新
      this._perfData.lastProcessTime = processTime;
      this._perfData.processCount++;
      this._perfData.averageProcessTime =
        (this._perfData.averageProcessTime * (this._perfData.processCount - 1) + processTime) /
        this._perfData.processCount;
    }
  }

  /**
   * 進捗状況を更新する
   * @private
   */
  _updateProgress() {
    // パターン内の進捗
    const currentPatternLength = this.patternLengths[this.patternIndex] || 1;
    const patternProgress = Math.floor((this.currentInput.length / currentPatternLength) * 100);

    // 全体の進捗
    let totalTyped = 0;
    let totalRequired = 0;

    // 完了したパターンの文字数を合計
    for (let i = 0; i < this.patternIndex; i++) {
      totalTyped += this.patternLengths[i];
      totalRequired += this.patternLengths[i];
    }

    // 現在のパターンの入力済み文字数を追加
    totalTyped += this.currentInput.length;
    totalRequired += currentPatternLength;

    // 残りのパターンの文字数を追加
    for (let i = this.patternIndex + 1; i < this.patterns.length; i++) {
      totalRequired += this.patternLengths[i];
    }

    const totalProgress = Math.floor((totalTyped / totalRequired) * 100);

    this.completionStatus = {
      completed: false,
      patternProgress,
      totalProgress,
    };
  }

  /**
   * 次に入力するべきキーを取得
   * @returns {string} 期待される次のキー
   */
  getCurrentExpectedKey() {
    if (this.completionStatus.completed) return '';

    const currentPattern = this.patterns[this.patternIndex];
    if (!currentPattern) return '';

    // オリジナルのパターンから入力位置の文字を取得
    for (let variant of currentPattern) {
      if (this.currentInput.length < variant.length) {
        return variant[this.currentInput.length];
      }
    }

    return '';
  }

  /**
   * 現在の完了率（%）を取得
   * @returns {number} 完了率（0-100）
   */
  getCompletionPercentage() {
    return this.completionStatus.totalProgress;
  }

  /**
   * 色分け表示用の情報を取得
   * @returns {Object} 色分け表示用情報
   */
  getColoringInfo() {
    const expectedNextChar = this.getCurrentExpectedKey();

    // 現在の文字のローマ字表現
    let currentCharRomaji = '';
    if (this.patterns[this.patternIndex]) {
      currentCharRomaji = this.patterns[this.patternIndex][0] || '';
    }

    return {
      romaji: this.displayRomaji,
      typedLength: this.typedString.length,
      currentInputLength: this.currentInput.length,
      currentCharIndex: this.currentCharIndex,
      currentInput: this.currentInput,
      expectedNextChar,
      currentCharRomaji,
    };
  }

  /**
   * パフォーマンスデータを取得
   * @returns {Object} パフォーマンスデータ
   */
  getPerformanceData() {
    return { ...this._perfData };
  }
}
