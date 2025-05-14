'use client';

import { useState, useEffect } from 'react';
import {
  initWasm,
  processCharWasm,
  processInputWasm,
  calculateTypingScoreWasm
} from '../../wasm/typing-engine';
import styles from './page.module.css';

export default function WebAssemblyTestPage() {
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [testResults, setTestResults] = useState({
    charTest: null,
    stringTest: null,
    scoreTest: null
  });
  const [inputChar, setInputChar] = useState('');
  const [expectedChar, setExpectedChar] = useState('a');
  const [inputText, setInputText] = useState('');
  const [expectedText, setExpectedText] = useState('hello');
  const [correctCount, setCorrectCount] = useState(100);
  const [missCount, setMissCount] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(60000);
  const [benchmarkResults, setBenchmarkResults] = useState(null);

  // WebAssemblyの初期化
  useEffect(() => {
    async function initialize() {
      try {
        const success = await initWasm();
        setWasmInitialized(success);
        console.log(`WebAssembly初期化: ${success ? '成功' : '失敗'}`);
      } catch (err) {
        console.error('WebAssembly初期化エラー:', err);
        setWasmInitialized(false);
      }
    }

    initialize();
  }, []);

  // 一文字テスト
  const testProcessChar = () => {
    if (!wasmInitialized) {
      alert('WebAssemblyが初期化されていません');
      return;
    }

    const result = processCharWasm(inputChar, expectedChar);
    setTestResults({
      ...testResults,
      charTest: {
        input: inputChar,
        expected: expectedChar,
        result,
        message: result ? '一致しました' : '一致しませんでした'
      }
    });
  };

  // 文字列テスト
  const testProcessInput = () => {
    if (!wasmInitialized) {
      alert('WebAssemblyが初期化されていません');
      return;
    }

    const result = processInputWasm(inputText, expectedText);
    setTestResults({
      ...testResults,
      stringTest: {
        input: inputText,
        expected: expectedText,
        matchCount: result.matchCount,
        matchRatio: result.matchRatio,
        message: `一致文字数: ${result.matchCount}/${Math.min(inputText.length, expectedText.length)} (${(result.matchRatio * 100).toFixed(1)}%)`
      }
    });
  };

  // スコア計算テスト
  const testCalculateScore = () => {
    if (!wasmInitialized) {
      alert('WebAssemblyが初期化されていません');
      return;
    }

    const score = calculateTypingScoreWasm(correctCount, missCount, elapsedTime);
    setTestResults({
      ...testResults,
      scoreTest: {
        correctCount,
        missCount,
        elapsedTime,
        score,
        message: `計算されたスコア: ${score}`
      }
    });
  };

  // パフォーマンスベンチマーク
  const runBenchmark = () => {
    if (!wasmInitialized) {
      alert('WebAssemblyが初期化されていません');
      return;
    }

    const iterations = 10000;
    let wasmTime = 0;
    let jsTime = 0;

    // ウォームアップ
    for (let i = 0; i < 100; i++) {
      processCharWasm('a', 'a');
      'a' === 'a';
    }

    // WebAssemblyのベンチマーク
    const wasmStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      processCharWasm('a', 'a');
    }
    wasmTime = performance.now() - wasmStart;

    // JavaScript標準のベンチマーク
    const jsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      'a' === 'a';
    }
    jsTime = performance.now() - jsStart;

    // 文字列処理のベンチマーク
    const testString = 'Hello, WebAssembly performance test!';
    const wasmStringStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      processInputWasm(testString, testString);
    }
    const wasmStringTime = performance.now() - wasmStringStart;

    // JavaScript標準の文字列処理ベンチマーク
    const jsStringStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      // 単純な文字列比較の実装（WebAssemblyと同等の処理）
      let matchCount = 0;
      for (let j = 0; j < testString.length; j++) {
        if (testString[j] === testString[j]) matchCount++;
      }
      const matchRatio = matchCount / testString.length;
    }
    const jsStringTime = performance.now() - jsStringStart;

    setBenchmarkResults({
      iterations,
      charComparison: {
        wasm: wasmTime.toFixed(2),
        js: jsTime.toFixed(2),
        diff: ((jsTime / wasmTime) - 1) * 100,
        faster: wasmTime < jsTime ? 'WebAssembly' : 'JavaScript'
      },
      stringProcessing: {
        wasm: wasmStringTime.toFixed(2),
        js: jsStringTime.toFixed(2),
        diff: ((jsStringTime / wasmStringTime) - 1) * 100,
        faster: wasmStringTime < jsStringTime ? 'WebAssembly' : 'JavaScript'
      }
    });
  };

  return (
    <main className={styles.main}>
      <h1>WebAssembly タイピングエンジンテスト</h1>

      <div className={styles.status}>
        <p>WebAssembly状態: <strong>{wasmInitialized ? '初期化済み' : '未初期化'}</strong></p>
        {!wasmInitialized && (
          <p className={styles.warning}>WebAssemblyが初期化されていません。機能テストはできません。</p>
        )}
      </div>

      <div className={styles.testArea}>
        <h2>1. 一文字入力テスト</h2>
        <div className={styles.testInputs}>
          <div>
            <label>入力文字:</label>
            <input
              type="text"
              value={inputChar}
              onChange={(e) => setInputChar(e.target.value.charAt(0))}
              maxLength={1}
            />
          </div>
          <div>
            <label>期待文字:</label>
            <input
              type="text"
              value={expectedChar}
              onChange={(e) => setExpectedChar(e.target.value.charAt(0))}
              maxLength={1}
            />
          </div>
          <button onClick={testProcessChar} disabled={!wasmInitialized}>テスト実行</button>
        </div>

        {testResults.charTest && (
          <div className={styles.result}>
            <h3>結果:</h3>
            <p>入力: '{testResults.charTest.input}'</p>
            <p>期待: '{testResults.charTest.expected}'</p>
            <p className={testResults.charTest.result ? styles.success : styles.error}>
              {testResults.charTest.message}
            </p>
          </div>
        )}
      </div>

      <div className={styles.testArea}>
        <h2>2. 文字列入力テスト</h2>
        <div className={styles.testInputs}>
          <div>
            <label>入力文字列:</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <div>
            <label>期待文字列:</label>
            <input
              type="text"
              value={expectedText}
              onChange={(e) => setExpectedText(e.target.value)}
            />
          </div>
          <button onClick={testProcessInput} disabled={!wasmInitialized}>テスト実行</button>
        </div>

        {testResults.stringTest && (
          <div className={styles.result}>
            <h3>結果:</h3>
            <p>入力: '{testResults.stringTest.input}'</p>
            <p>期待: '{testResults.stringTest.expected}'</p>
            <p>
              {testResults.stringTest.message}
            </p>
            <div className={styles.matchBar}>
              <div
                className={styles.matchFill}
                style={{ width: `${testResults.stringTest.matchRatio * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.testArea}>
        <h2>3. スコア計算テスト</h2>
        <div className={styles.testInputs}>
          <div>
            <label>正解数:</label>
            <input
              type="number"
              value={correctCount}
              onChange={(e) => setCorrectCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label>ミス数:</label>
            <input
              type="number"
              value={missCount}
              onChange={(e) => setMissCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label>経過時間(ms):</label>
            <input
              type="number"
              value={elapsedTime}
              onChange={(e) => setElapsedTime(parseInt(e.target.value) || 0)}
            />
          </div>
          <button onClick={testCalculateScore} disabled={!wasmInitialized}>テスト実行</button>
        </div>

        {testResults.scoreTest && (
          <div className={styles.result}>
            <h3>結果:</h3>
            <p>正解数: {testResults.scoreTest.correctCount}</p>
            <p>ミス数: {testResults.scoreTest.missCount}</p>
            <p>経過時間: {testResults.scoreTest.elapsedTime}ms</p>
            <p className={styles.scoreResult}>
              {testResults.scoreTest.message}
            </p>
          </div>
        )}
      </div>

      <div className={styles.testArea}>
        <h2>4. パフォーマンステスト</h2>
        <button
          onClick={runBenchmark}
          disabled={!wasmInitialized}
          className={styles.benchmarkButton}
        >
          ベンチマーク実行
        </button>

        {benchmarkResults && (
          <div className={styles.benchmarkResults}>
            <h3>ベンチマーク結果 ({benchmarkResults.iterations}回実行):</h3>

            <div className={styles.benchmarkItem}>
              <h4>一文字比較:</h4>
              <p>WebAssembly: {benchmarkResults.charComparison.wasm}ms</p>
              <p>JavaScript: {benchmarkResults.charComparison.js}ms</p>
              <p className={styles.benchmarkDiff}>
                {benchmarkResults.charComparison.faster} は
                {Math.abs(benchmarkResults.charComparison.diff).toFixed(2)}%
                {benchmarkResults.charComparison.diff > 0 ? '速い' : '遅い'}
              </p>
            </div>

            <div className={styles.benchmarkItem}>
              <h4>文字列処理:</h4>
              <p>WebAssembly: {benchmarkResults.stringProcessing.wasm}ms</p>
              <p>JavaScript: {benchmarkResults.stringProcessing.js}ms</p>
              <p className={styles.benchmarkDiff}>
                {benchmarkResults.stringProcessing.faster} は
                {Math.abs(benchmarkResults.stringProcessing.diff).toFixed(2)}%
                {benchmarkResults.stringProcessing.diff > 0 ? '速い' : '遅い'}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}