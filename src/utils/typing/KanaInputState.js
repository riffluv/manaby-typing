/**
 * KanaInputState - かな文字一文字に対する入力状態を管理するクラス
 * 
 * このクラスは一つのかな文字（例：「と」）の入力状態を管理します。
 * 入力可能なすべてのローマ字パターン（例：「と」→「to」）と現在の入力状態を管理し、
 * 入力が完了したかどうか、次に期待される入力は何かなどを判断します。
 */
export class KanaInputState {
  /**
   * コンストラクタ
   * @param {string} kana かな文字
   * @param {string[]} patterns 入力可能なローマ字パターン配列
   */
  constructor(kana, patterns) {
    this.kana = kana;             // かな文字（例：「と」）
    this.patterns = patterns;     // 入力可能なローマ字パターン（例：「to」）
    this.currentInput = '';       // 現在の入力（例：「t」）
    this.completed = false;       // 入力完了フラグ
    
    // 効率化のために最初の期待入力文字をキャッシュ
    this.firstChars = new Set();
    patterns.forEach(pattern => {
      if (pattern.length > 0) {
        this.firstChars.add(pattern[0]);
      }
    });
  }

  /**
   * 入力処理
   * @param {string} char 入力された文字
   * @returns {object} 処理結果 {success: boolean, status: string}
   */
  handleInput(char) {
    // すでに完了している場合は何もしない
    if (this.completed) {
      return { success: false, status: 'already_completed' };
    }

    const lowerChar = char.toLowerCase();
    const newInput = this.currentInput + lowerChar;
    
    // 完全一致パターンを探す
    const exactMatch = this.patterns.some(pattern => pattern === newInput);
    
    // 前方一致パターンを探す
    const prefixMatch = this.patterns.some(pattern => 
      pattern.startsWith(newInput) && newInput.length < pattern.length
    );
    
    // 入力の受け入れ結果を判定
    if (exactMatch) {
      // 完全に一致した場合、入力完了
      this.currentInput = newInput;
      this.completed = true;
      return { success: true, status: 'completed' };
    } else if (prefixMatch) {
      // 前方一致した場合、部分入力として受け入れ
      this.currentInput = newInput;
      return { success: true, status: 'in_progress' };
    }
    
    // 一致しない場合、入力を拒否
    return { success: false, status: 'invalid_input' };
  }

  /**
   * 現在の入力状態から、次に期待される入力キーを取得
   * @returns {string[]} 次に期待される入力キーの配列
   */
  getNextExpectedKeys() {
    if (this.completed) {
      return [];
    }
    
    const expectedKeys = new Set();
    
    // 現在の入力から次の文字を予測
    for (const pattern of this.patterns) {
      if (pattern.startsWith(this.currentInput) && this.currentInput.length < pattern.length) {
        expectedKeys.add(pattern[this.currentInput.length]);
      }
    }
    
    return [...expectedKeys];
  }
  
  /**
   * 入力完了したかどうかを返す
   * @returns {boolean} 入力完了フラグ
   */
  isCompleted() {
    return this.completed;
  }
  
  /**
   * 入力済みのローマ字部分を取得
   * @returns {string} 入力済みローマ字
   */
  getCompletedPart() {
    return this.currentInput;
  }
  
  /**
   * 残りの入力が必要なローマ字部分を取得
   * @returns {string} 残り入力が必要なローマ字
   */
  getRemainingPart() {
    if (this.completed) {
      return '';
    }
    
    // 現在の入力に続く最短のパターンを探す
    let shortestRemaining = null;
    
    for (const pattern of this.patterns) {
      if (pattern.startsWith(this.currentInput)) {
        const remaining = pattern.substring(this.currentInput.length);
        if (shortestRemaining === null || remaining.length < shortestRemaining.length) {
          shortestRemaining = remaining;
        }
      }
    }
    
    return shortestRemaining || '';
  }
  
  /**
   * この文字の入力文字数（ローマ字長）を返す
   * @returns {number} 入力文字数
   */
  getCharacterCount() {
    if (this.patterns.length === 0) return 0;
    
    // 最初のパターンの長さを返す（一般的に最も一般的なパターン）
    return this.patterns[0].length;
  }
  
  /**
   * 現在の入力が指定された文字で始まるかどうかを検証
   * @param {string} char 検証する文字
   * @returns {boolean} 検証結果
   */
  canStartWith(char) {
    return this.firstChars.has(char.toLowerCase());
  }
  
  /**
   * 現在の状態をリセット
   */
  reset() {
    this.currentInput = '';
    this.completed = false;
  }
}
