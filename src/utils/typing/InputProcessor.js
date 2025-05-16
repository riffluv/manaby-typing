'use client';

/**
 * InputProcessor.js
 * タイピングゲームの入力処理全体を管理するクラス
 * 
 * KanaInputStateクラスを使って、テキスト全体の入力状態を管理し、
 * キー入力に対する適切な反応と表示情報を提供します。
 */

import { KanaInputState } from './KanaInputState';
import { parseText } from './RomajiConverter';

/**
 * タイピング入力処理を担当するクラス
 * テキスト全体の入力状態管理と、ユーザー入力に対する反応を提供
 */
export class InputProcessor {
  /**
   * コンストラクタ
   * @param {string} text タイピング対象のテキスト
   */
  constructor(text) {
    // 入力対象テキストをパース
    const parsedItems = parseText(text);
    
    // 各文字の入力状態オブジェクトを生成
    this.kanaStates = parsedItems.map(item => 
      new KanaInputState(item.kana, item.patterns)
    );
    
    // 現在の入力位置
    this.currentIndex = 0;
    
    // 入力完了フラグ
    this.completed = false;
    
    // 原文とローマ字表記
    this.originalText = text;
    this.romajiText = this.kanaStates.map(state => state.patterns[0] || '').join('');
    
    // 入力エラー状態
    this.isError = false;
    this.errorTimeout = null;
    
    // 入力統計情報
    this.stats = {
      startTime: 0,
      endTime: 0,
      correctKeyCount: 0,
      missCount: 0
    };
  }
  
  /**
   * キー入力を処理する
   * @param {string} key 入力されたキー
   * @returns {object} 処理結果
   */
  handleInput(key) {
    // 入力統計の記録開始
    if (this.stats.startTime === 0) {
      this.stats.startTime = Date.now();
    }
    
    // すでに完了している場合は何もしない
    if (this.completed) {
      return {
        success: false,
        status: 'already_completed',
        displayInfo: this.getDisplayInfo()
      };
    }
    
    // 現在の文字の入力状態
    const currentState = this.kanaStates[this.currentIndex];
    
    // キー入力を処理
    const result = currentState.handleInput(key);
    
    if (result.success) {
      // 正しい入力
      this.stats.correctKeyCount++;
      this.isError = false;
      
      // エラータイムアウトをクリア
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
        this.errorTimeout = null;
      }
      
      // 文字入力が完了した場合
      if (currentState.isCompleted()) {
        // 次の文字へ
        this.currentIndex++;
        
        // 全体が完了したか確認
        if (this.currentIndex >= this.kanaStates.length) {
          this.completed = true;
          this.stats.endTime = Date.now();
        }
      }
      
      return {
        success: true,
        status: this.completed ? 'all_completed' : (currentState.isCompleted() ? 'char_completed' : 'in_progress'),
        displayInfo: this.getDisplayInfo()
      };
    } else {
      // 誤入力の場合
      this.stats.missCount++;
      this.isError = true;
      
      // エラー状態を一定時間後に解除するタイムアウト
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
      }
      this.errorTimeout = setTimeout(() => {
        this.isError = false;
      }, 500); // 500ms後にエラー表示を解除
      
      return {
        success: false,
        status: 'invalid_input',
        displayInfo: this.getDisplayInfo()
      };
    }
  }
  
  /**
   * 表示情報を取得する
   * @returns {object} 表示に必要な情報
   */
  getDisplayInfo() {
    if (this.completed) {
      // 入力完了時
      return {
        romaji: this.romajiText,
        typedLength: this.romajiText.length,
        currentCharIndex: this.currentIndex,
        currentInput: '',
        expectedNextChar: null,
        isError: false,
        completed: true,
        completedText: this.originalText,
        typedText: this.originalText,
        displayParts: [{
          type: 'completed',
          text: this.romajiText
        }]
      };
    }
    
    // 現在入力中の文字
    const currentState = this.kanaStates[this.currentIndex];
    
    // これまでに入力済みのローマ字
    let typedRomaji = '';
    for (let i = 0; i < this.currentIndex; i++) {
      const pattern = this.kanaStates[i].patterns[0] || '';
      typedRomaji += pattern;
    }
    
    // 現在の文字の入力状況
    const completedPart = currentState.getCompletedPart();
    const remainingPart = currentState.getRemainingPart();
    const expectedNextChar = remainingPart.length > 0 ? remainingPart[0] : '';
    
    // 残りの文字のローマ字
    let remainingRomaji = '';
    for (let i = this.currentIndex + 1; i < this.kanaStates.length; i++) {
      const pattern = this.kanaStates[i].patterns[0] || '';
      remainingRomaji += pattern;
    }
    
    // 表示用のパーツを構築
    const displayParts = [];
    
    // 入力済み部分
    if (typedRomaji) {
      displayParts.push({
        type: 'typed',
        text: typedRomaji
      });
    }
    
    // 現在入力中の文字
    if (completedPart) {
      displayParts.push({
        type: 'current_input',
        text: completedPart
      });
    }
    
    // 次に入力すべき文字
    if (expectedNextChar) {
      displayParts.push({
        type: this.isError ? 'error' : 'next_char',
        text: expectedNextChar
      });
    }
    
    // 現在の文字の残りの部分
    if (remainingPart.length > 1) {
      displayParts.push({
        type: 'current_remaining',
        text: remainingPart.substring(1)
      });
    }
    
    // 残りの文字
    if (remainingRomaji) {
      displayParts.push({
        type: 'not_typed',
        text: remainingRomaji
      });
    }
    
    // 表示情報を返す
    return {
      romaji: this.romajiText,
      typedLength: typedRomaji.length + completedPart.length,
      currentCharIndex: this.currentIndex,
      currentInput: completedPart,
      expectedNextChar,
      isError: this.isError,
      completed: this.completed,
      completedText: '',
      typedText: '',
      displayParts
    };
  }
  
  /**
   * 進捗率を取得する
   * @returns {number} 0-100のパーセント値
   */
  getCompletionPercentage() {
    if (this.completed) return 100;
    if (this.kanaStates.length === 0) return 0;
    
    // 入力済み文字数 / 全体の文字数
    let typedLength = 0;
    let totalLength = 0;
    
    for (let i = 0; i < this.kanaStates.length; i++) {
      const state = this.kanaStates[i];
      const patternLength = state.getCharacterCount();
      totalLength += patternLength;
      
      if (i < this.currentIndex) {
        // 完全に入力済みの文字
        typedLength += patternLength;
      } else if (i === this.currentIndex && !state.isCompleted()) {
        // 現在入力中の文字
        typedLength += state.getCompletedPart().length;
      }
    }
    
    return Math.floor((typedLength / totalLength) * 100);
  }
  
  /**
   * 統計情報を取得する
   * @returns {object} 統計情報
   */
  getStats() {
    const elapsedTime = (this.stats.endTime || Date.now()) - this.stats.startTime;
    const elapsedMinutes = elapsedTime / 60000; // ミリ秒から分へ変換
    
    // 総入力数
    const totalInputCount = this.stats.correctKeyCount + this.stats.missCount;
    
    return {
      correctKeyCount: this.stats.correctKeyCount,
      missCount: this.stats.missCount,
      accuracy: totalInputCount > 0 ? (this.stats.correctKeyCount / totalInputCount) * 100 : 100,
      kpm: elapsedMinutes > 0 ? Math.round(this.stats.correctKeyCount / elapsedMinutes) : 0,
      elapsedTime
    };
  }
  
  /**
   * 現在の状態をリセットする
   */
  reset() {
    this.currentIndex = 0;
    this.completed = false;
    this.isError = false;
    
    // 各文字の入力状態をリセット
    for (const state of this.kanaStates) {
      state.reset();
    }
    
    // 統計情報のリセット
    this.stats = {
      startTime: 0,
      endTime: 0,
      correctKeyCount: 0,
      missCount: 0
    };
    
    // タイムアウトのクリア
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
      this.errorTimeout = null;
    }
  }
}
