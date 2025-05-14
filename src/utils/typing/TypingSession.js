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
      startTime = 0,
      endTime = 0,
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

    // タイミング情報
    this.startTime = startTime;
    this.endTime = endTime;
    this.duration = this.endTime - this.startTime;
    this.active = false;

    // コンボ情報
    this.combo = 0;
    this.maxCombo = 0;

    // パフォーマンス測定用
    this._perfData = {
      lastProcessTime: 0,
      averageProcessTime: 0,
      processCount: 0,
      lastUpdateTime: 0,
    };

    // 入力キャッシュ
    this._inputResultCache = new Map();
  }

  /**
   * 表示用ローマ字文字列を生成
   * @returns {string} 表示用ローマ字文字列
   * @private
   */
  _generateDisplayRomaji() {
    return this.patterns.map((pattern) => pattern[0]).join('');
  }

  /**
   * タイムベースの更新を実行し、経過時間に基づいて処理を行う
   * @param {number} currentTime 現在の時間（ミリ秒）
   * @returns {Array} [changed, leftover] - 行が変更されたか、残りの文字数
   */
  update(currentTime) {
    let changed = false;
    let leftover = 0;

    // 現在のパフォーマンスを測定
    const now = performance.now();
    this._perfData.lastUpdateTime = now;

    // 時間経過による行の完了・切り替え処理（時間ベースで自動進行）
    if (
      this.endTime > 0 &&
      currentTime > this.endTime &&
      !this.completionStatus.completed
    ) {
      // 残りの未入力文字をカウント
      leftover = this.getLeftoverCharCount();

      // 行を強制的に完了状態に設定
      this.completionStatus.completed = true;
      this.completionStatus.totalProgress = 100;
      changed = true;
    }

    return [changed, leftover];
  }

  /**
   * この行をアクティブにする
   */
  makeActive() {
    this.active = true;
    // 始めてアクティブになった時に開始時間を記録できる
    if (!this.startTime) {
      this.startTime = performance.now();
    }
  }

  /**
   * 未入力の残り文字数を取得
   * @returns {number} 残りの文字数
   */
  getLeftoverCharCount() {
    // 完了している場合は0を返す
    if (this.completionStatus.completed) return 0;

    // 残りのパターンの文字数をカウント
    let leftover = 0;

    // 現在のパターンの残り
    if (this.patternIndex < this.patterns.length) {
      const currentPatternLength = this.patternLengths[this.patternIndex];
      leftover += currentPatternLength - this.currentInput.length;
    }

    // 残りのパターン
    for (let i = this.patternIndex + 1; i < this.patterns.length; i++) {
      leftover += this.patternLengths[i];
    }

    return leftover;
  }

  /**
   * 合計の文字数を取得
   * @returns {number} 合計の文字数
   */
  getCharacterCount() {
    return this.patternLengths.reduce((sum, length) => sum + length, 0);
  }

  /**
   * キー入力を処理する (accept形式のインタフェース)
   * @param {string} character 入力された文字
   * @returns {number} 処理結果 (1: 成功, -1: 失敗, 0: 無効)
   */
  accept(character) {
    if (this.completionStatus.completed) {
      return -1;
    }

    // 入力キャッシュをチェック
    const cacheKey = `${this.patternIndex}-${this.currentInput.length}-${character}`;
    if (this._inputResultCache.has(cacheKey)) {
      const cachedResult = this._inputResultCache.get(cacheKey);

      if (cachedResult) {
        // キャッシュヒット時はキャッシュされた結果を利用
        if (cachedResult.success) {
          this.currentInput = cachedResult.newInput || this.currentInput;
          this.typedString = cachedResult.newTyped || this.typedString;
          this.patternIndex = cachedResult.newPatternIndex || this.patternIndex;
          this.currentCharIndex =
            cachedResult.newCharIndex || this.currentCharIndex;
          this.completionStatus =
            cachedResult.newCompletionStatus || this.completionStatus;

          // コンボ更新
          this.combo += 1;
          this.maxCombo = Math.max(this.combo, this.maxCombo);

          return 1;
        } else {
          // ミス入力はコンボリセット
          this.combo = 0;
          return -1;
        }
      }
    }

    // キャッシュミス時は通常処理
    const result = this.processInput(character);

    // 処理結果をキャッシュ
    if (result.success) {
      this._inputResultCache.set(cacheKey, {
        success: true,
        newInput: this.currentInput,
        newTyped: this.typedString,
        newPatternIndex: this.patternIndex,
        newCharIndex: this.currentCharIndex,
        newCompletionStatus: this.completionStatus,
      });

      // コンボ更新
      this.combo += 1;
      this.maxCombo = Math.max(this.combo, this.maxCombo);

      return 1;
    } else {
      this._inputResultCache.set(cacheKey, { success: false });

      // ミス入力はコンボリセット
      this.combo = 0;
      return -1;
    }
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
        } // 進捗状況の更新
        this._updateProgress();

        // 進捗が100%に達した場合も完了と判定する（強化）
        if (this.completionStatus.totalProgress >= 99.9) {
          this.completionStatus.completed = true;
          this.completionStatus.totalProgress = 100;
          return {
            success: true,
            status: 'all_completed',
            progress: 100,
          };
        }

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
        (this._perfData.averageProcessTime * (this._perfData.processCount - 1) +
          processTime) /
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
    const patternProgress = Math.floor(
      (this.currentInput.length / currentPatternLength) * 100
    );

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
   * 現在の入力中の表示テキストを取得
   * @returns {string} 残りの入力テキスト
   */
  getRemainingText() {
    if (this.completionStatus.completed) return '';

    // 残りの入力テキストを構築
    let remainingText = '';

    // 現在のパターンの残り
    if (this.patternIndex < this.patterns.length) {
      const currentPattern = this.patterns[this.patternIndex][0] || '';
      remainingText = currentPattern.substring(this.currentInput.length);
    }

    // 残りのパターン
    for (let i = this.patternIndex + 1; i < this.patterns.length; i++) {
      remainingText += this.patterns[i][0] || '';
    }

    return remainingText.toUpperCase();
  }

  /**
   * 完了状態かどうかを確認
   * @returns {boolean} 完了状態の場合true
   */ isCompleted() {
    // デバッグログ追加
    if (
      this.completionStatus.totalProgress >= 99 &&
      !this.completionStatus.completed
    ) {
      // 進捗は99%以上だが完了フラグがfalseの場合は、エラー状態の可能性があるため
      // デバッグが必要な場合のみログを表示

      // 進捗が99%以上ならcompletedも強制的にtrueにする
      this.completionStatus.completed = true;
    }
    return this.completionStatus.completed;
  }

  /**
   * 現在のコンボ数を取得
   * @returns {number} コンボ数
   */
  getCombo() {
    return this.combo;
  }

  /**
   * 最大コンボ数を取得
   * @returns {number} 最大コンボ数
   */
  getMaxCombo() {
    return this.maxCombo;
  }
}
