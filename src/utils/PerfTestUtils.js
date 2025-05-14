/**
 * PerfTestUtils.js
 * タイピングゲームのパフォーマンステストユーティリティ
 * 2025年5月10日作成
 */

// インスタンスのグローバルプール
const instances = new Map();

/**
 * パフォーマンステストのためのユーティリティクラス
 */
export default class PerfTestUtils {
  /**
   * 新しいテストインスタンスを作成または取得
   * @param {string} testId テスト識別子
   * @returns {Object} テストインスタンス
   */
  static getTestInstance(testId = 'default') {
    if (!instances.has(testId)) {
      instances.set(testId, this._createTestInstance(testId));
    }
    return instances.get(testId);
  }

  /**
   * テストインスタンスを作成
   * @private
   */
  static _createTestInstance(testId) {
    const startTime = performance.now();
    return {
      id: testId,
      startTime,
      endTime: null,
      measurements: [],
      markers: {},
      counters: {},

      // 処理時間を記録
      recordTiming(name, time) {
        this.measurements.push({
          name,
          time,
          timestamp: performance.now() - this.startTime
        });
        return this;
      },

      // マーカーを設定
      mark(name) {
        this.markers[name] = performance.now() - this.startTime;
        return this;
      },

      // カウンタを増加
      incrementCounter(name, value = 1) {
        this.counters[name] = (this.counters[name] || 0) + value;
        return this;
      },

      // テストを終了
      endTest() {
        this.endTime = performance.now();
        return this;
      },

      // テスト結果を取得
      getResults() {
        const duration = this.endTime ?
          this.endTime - this.startTime :
          performance.now() - this.startTime;

        return {
          testId: this.id,
          duration,
          measurements: this.measurements,
          markers: this.markers,
          counters: this.counters
        };
      },

      // テスト結果をコンソールに出力
      logResults() {
        const results = this.getResults();
        console.group(`🧪 テスト結果: ${this.id}`);
        console.log(`⏱️ 所要時間: ${results.duration.toFixed(2)}ms`);

        if (Object.keys(this.counters).length > 0) {
          console.group('カウンタ');
          for (const [key, value] of Object.entries(this.counters)) {
            console.log(`${key}: ${value}`);
          }
          console.groupEnd();
        }

        if (Object.keys(this.markers).length > 0) {
          console.group('マーカー');
          for (const [key, value] of Object.entries(this.markers)) {
            console.log(`${key}: ${value.toFixed(2)}ms`);
          }
          console.groupEnd();
        }

        if (this.measurements.length > 0) {
          console.group('測定値');
          for (const m of this.measurements) {
            console.log(`${m.name}: ${m.time.toFixed(2)}ms (${m.timestamp.toFixed(2)}ms)`);
          }
          console.groupEnd();
        }

        console.groupEnd();
        return this;
      },

      // テストをリセット
      reset() {
        this.startTime = performance.now();
        this.endTime = null;
        this.measurements = [];
        this.markers = {};
        this.counters = {};
        return this;
      }
    };
  }

  /**
   * このユーティリティを使ったタイピング性能測定用関数
   * @param {function} typeFunction タイピング処理関数
   * @param {Array} inputs 入力する文字の配列
   * @param {Object} options オプション設定
   */
  static async testTypingPerformance(typeFunction, inputs, options = {}) {
    const {
      delay = 50,
      testId = 'typing',
      logResults = true
    } = options;

    const test = this.getTestInstance(testId).reset();
    test.mark('start');

    let successCount = 0;
    let failCount = 0;

    // 入力をシミュレート
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const startProcess = performance.now();

      // 入力を処理
      const success = typeFunction(input);

      // 結果を記録
      const endProcess = performance.now();
      const processTime = endProcess - startProcess;

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      test.recordTiming(`input_${i}`, processTime);

      // 処理間隔を設ける
      if (i < inputs.length - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // カウンタを更新
    test.incrementCounter('success', successCount);
    test.incrementCounter('fail', failCount);
    test.mark('end');
    test.endTest();

    if (logResults) {
      test.logResults();
    }

    return test.getResults();
  }
}
