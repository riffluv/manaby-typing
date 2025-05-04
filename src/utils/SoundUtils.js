'use client';

/**
 * Web Audio APIを使用した効果音とBGMシステム
 */
class SoundUtils {
  constructor() {
    // ブラウザ環境（クライアントサイド）でのみAudioContextを初期化
    if (typeof window !== 'undefined') {
      // AudioContextのインスタンス作成（ブラウザ互換性対応）
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();

      // Gainノードの作成（効果音の音量調整用）
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);

      // BGM用のGainノードを作成
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.context.destination);
    }

    // 効果音バッファを保持するオブジェクト
    this.sfxBuffers = {};

    // 効果音の音量設定（0.0〜1.0）
    this.volume = 1.0;

    // 効果音のオン/オフ設定
    this.sfxEnabled = true;

    // BGM関連の設定
    this.bgmEnabled = true;
    this.bgmVolume = 0.5; // デフォルトのBGM音量
    this.currentBgm = null; // 現在再生中のBGMを保持
    this.bgmAudio = null;   // BGM用のAudio要素

    // サウンドプリセット定義
    this.soundPresets = {
      // 基本ゲーム効果音
      success: '/sounds/Hit05-1.mp3', // タイピング成功音
      error: '/sounds/Hit04-1.mp3',   // タイピングエラー音
      complete: '/sounds/resultsound.mp3', // ゲームクリア音
      button: '/sounds/buttonsound1.mp3',  // ボタンクリック音
      level: '/sounds/xylophone-mini-dessert.mp3', // レベルアップ音
    };

    // BGMプリセット定義
    this.bgmPresets = {
      mainTheme: '/sounds/Battle of the Emperor.mp3', // メインテーマ曲
    };

    // キャッシュバスティング用のタイムスタンプ
    this.timestamp = Date.now();

    console.log('[DEBUG] サウンドシステム初期化完了');
  }

  /**
   * 効率的な音声読み込み - 重要な効果音だけを事前にロード、その他は遅延読み込み
   * @returns {Promise} ロード完了時に解決されるPromise
   */
  async initializeAllSounds() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    try {
      // 最も重要な効果音のみを最初に読み込む（タイピング時に即時必要）
      const criticalSounds = ['success', 'error'];
      const criticalLoadPromises = [];

      for (const name of criticalSounds) {
        if (this.soundPresets[name]) {
          criticalLoadPromises.push(
            this.loadSound(name, this.soundPresets[name])
          );
        }
      }

      // 重要な効果音を先に読み込み終える
      await Promise.all(criticalLoadPromises);
      console.log('重要な効果音のロードが完了しました');

      // その他の効果音は非同期で読み込み（ユーザー体験を妨げない）
      const nonCriticalSounds = Object.entries(this.soundPresets).filter(
        ([name]) => !criticalSounds.includes(name)
      );

      // バックグラウンドで非同期読み込み - 重要でない効果音
      setTimeout(() => {
        for (const [name, url] of nonCriticalSounds) {
          // すでにロード済みの場合はスキップ
          if (!this.sfxBuffers[name.toLowerCase()]) {
            this.loadSound(name, url).catch((err) =>
              console.warn(
                `非クリティカル効果音「${name}」の事前ロードに失敗しました:`,
                err
              )
            );
          }
        }
        console.log('すべての効果音を非同期読み込み開始');
      }, 100); // わずかな遅延を設けて重要なレンダリングが完了するのを待つ

      return true;
    } catch (error) {
      console.error('効果音の初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * 効果音をロードして登録する
   * @param {string} name - 効果音の名前
   * @param {string} url - 効果音ファイルのURL
   * @returns {Promise} - ロード完了時に解決されるPromise
   */
  async loadSound(name, url) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    try {
      // 名前を小文字に統一して処理
      const lowerName = name.toLowerCase();

      // キャッシュバスティングのためにURLにタイムスタンプを追加
      const cacheBustedUrl = `${url}?t=${this.timestamp}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      console.log(`[DEBUG] サウンド「${name}」をロード中: ${cacheBustedUrl}`);

      const response = await fetch(cacheBustedUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // 音声データをデコード
      return new Promise((resolve, reject) => {
        this.context.decodeAudioData(
          arrayBuffer,
          (audioBuffer) => {
            this.sfxBuffers[lowerName] = audioBuffer;
            console.log(`[DEBUG] サウンド「${name}」のロード完了`);
            resolve();
          },
          (error) => {
            console.error(`サウンド「${name}」のデコードに失敗:`, error);
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error(`効果音「${name}」のロードに失敗しました:`, error);
      throw error;
    }
  }

  /**
   * 効果音を再生する - 高速応答最適化版
   * 大文字小文字を区別せずに処理し、未ロード時は自動的にロード
   * @param {string} name - 再生する効果音の名前
   */
  playSound(name) {
    // 効果音が無効化されている場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    // 大文字小文字を区別せずに名前を小文字に変換して処理
    const lowerName = name.toLowerCase();

    // バッファにあれば即時再生（最速パス）
    if (this.sfxBuffers[lowerName]) {
      this._playBuffer(this.sfxBuffers[lowerName]);
      return;
    }

    // バッファにない場合は遅延読み込み＋再生
    console.warn(
      `効果音「${name}」がプリロードされていません。オンデマンドでロードします...`
    );

    // プリセットも小文字で検索
    const presetKey = Object.keys(this.soundPresets).find(
      (key) => key.toLowerCase() === lowerName
    );

    // 登録されていない場合、プリセットから自動ロードを試みる
    if (presetKey) {
      // AudioContextを先に再開（iOS Safari対策）
      if (this.context && this.context.state === 'suspended') {
        this.context.resume();
      }

      // 遅延読み込みを開始し、ロード完了後に再生
      this.loadSound(lowerName, this.soundPresets[presetKey])
        .then(() => {
          // ロード完了後すぐに再生
          if (this.sfxBuffers[lowerName]) {
            this._playBuffer(this.sfxBuffers[lowerName]);
          }
        })
        .catch((err) =>
          console.error(
            `効果音「${name}」の自動ロード中にエラーが発生しました:`,
            err
          )
        );
    } else {
      console.error(`効果音「${name}」はプリセットに存在しません`);
    }
  }

  /**
   * 効果音を再生する (playSound のエイリアス - 互換性のため)
   * @param {string} name - 再生する効果音の名前
   */
  play(name) {
    return this.playSound(name);
  }

  /**
   * バッファから効果音を再生する（内部メソッド）
   * @param {AudioBuffer} buffer - 再生するオーディオバッファ
   * @private
   */
  _playBuffer(buffer) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.context) {
      return;
    }

    if (!buffer) {
      console.warn('再生しようとしたバッファが存在しません');
      return;
    }

    try {
      // AudioContextが停止状態ならすぐに再開（処理の最適化）
      if (this.context.state === 'suspended') {
        this.context.resume().catch((err) => {
          console.error('AudioContextの再開に失敗:', err);
        });
      }

      // 状態チェックを待たずに即座に再生を試みる（遅延を解消）
      this._playBufferInternal(buffer);
    } catch (error) {
      console.error(`効果音の再生処理中にエラーが発生しました:`, error);
    }
  }

  /**
   * 実際の音声再生処理を行う内部メソッド
   * @param {AudioBuffer} buffer - 再生するオーディオバッファ
   */
  _playBufferInternal(buffer) {
    try {
      // 新しいバッファソースノードを作成（Web Audio APIでは一度再生したノードは再利用できない）
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;

      // ゲインノードに接続（音量調整のため）
      sourceNode.connect(this.gainNode);

      // コンソールにデバッグ情報を出力
      console.log(
        `[DEBUG] 効果音を再生します - バッファ長: ${buffer.duration}秒`
      );

      // エラー処理を追加
      sourceNode.onended = () =>
        console.log('[DEBUG] 効果音の再生が完了しました');
      sourceNode.onerror = (err) =>
        console.error('[DEBUG] 効果音の再生中にエラー:', err);

      // 再生開始
      sourceNode.start(0);
      return true;
    } catch (error) {
      console.error(`効果音の再生に失敗しました:`, error);
      return false;
    }
  }

  /**
   * 効果音の音量を設定する
   * @param {number} value - 0.0〜1.0の間の値
   */
  setSfxVolume(value) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.gainNode) {
      return;
    }

    this.volume = Math.max(0, Math.min(1, value));

    // 効果音が有効な場合のみ音量を設定
    if (this.sfxEnabled) {
      this.gainNode.gain.value = this.volume;
    }

    console.log(`[DEBUG] 効果音の音量を設定: ${this.volume}`);
  }

  /**
   * 効果音の現在の音量を取得する
   * @returns {number} 0.0〜1.0の間の値
   */
  getSfxVolume() {
    return this.volume;
  }

  /**
   * 効果音を有効/無効に切り替える
   * @param {boolean} enabled - 効果音を有効にするか
   */
  setSfxEnabled(enabled) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.gainNode) {
      return;
    }

    this.sfxEnabled = enabled;
    this.gainNode.gain.value = enabled ? this.volume : 0;
    console.log(`[DEBUG] 効果音を${enabled ? '有効' : '無効'}にしました`);
  }

  /**
   * すべてのサウンドを有効/無効に切り替える (効果音のみ - 互換性のため残す)
   * @param {boolean} enabled - サウンドを有効にするか
   * @deprecated BGMとSFXを個別に設定するメソッドを使用してください
   */
  setEnabled(enabled) {
    this.setSfxEnabled(enabled);
  }

  // --- 新しいBGM関連のメソッド ---

  /**
   * BGMを再生する
   * @param {string} name - 再生するBGMの名前
   * @param {boolean} loop - ループ再生するかどうか (デフォルトはtrue)
   */
  playBgm(name, loop = true) {
    // サーバーサイドレンダリング時または無効時は何もしない
    if (typeof window === 'undefined' || !this.bgmEnabled) {
      return;
    }

    // 既に同じBGMを再生中なら何もしない
    if (this.currentBgm === name && this.bgmAudio && !this.bgmAudio.paused) {
      return;
    }

    // 現在のBGMを停止
    this.stopBgm();

    const bgmUrl = this.bgmPresets[name];
    if (!bgmUrl) {
      console.error(`BGM「${name}」はプリセットに存在しません`);
      return;
    }

    try {
      // Audio要素を作成してBGMを再生
      this.bgmAudio = new Audio(bgmUrl);
      this.bgmAudio.loop = loop;
      this.bgmAudio.volume = this.bgmVolume;
      
      // 再生開始前にユーザーインタラクションが必要な場合に備えてpromiseを返す
      const playPromise = this.bgmAudio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // 自動再生ポリシーによる再生失敗を処理
          console.warn(`BGM「${name}」の自動再生に失敗しました:`, error);
          // ユーザーインタラクション後に再生を試みるためのフラグをセット
          this._pendingBgmName = name;
        });
      }

      this.currentBgm = name;
      console.log(`[DEBUG] BGM「${name}」の再生を開始しました`);
    } catch (error) {
      console.error(`BGM「${name}」の再生に失敗しました:`, error);
    }
  }

  /**
   * 現在再生中のBGMを停止する
   */
  stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgm = null;
  }

  /**
   * BGMの音量を設定する
   * @param {number} value - 0.0〜1.0の間の値
   */
  setBgmVolume(value) {
    this.bgmVolume = Math.max(0, Math.min(1, value));
    
    if (this.bgmAudio && this.bgmEnabled) {
      this.bgmAudio.volume = this.bgmVolume;
    }
    
    console.log(`[DEBUG] BGMの音量を設定: ${this.bgmVolume}`);
  }

  /**
   * BGMの現在の音量を取得する
   * @returns {number} 0.0〜1.0の間の値
   */
  getBgmVolume() {
    return this.bgmVolume;
  }

  /**
   * BGMを有効/無効に切り替える
   * @param {boolean} enabled - BGMを有効にするか
   */
  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;
    
    if (this.bgmAudio) {
      if (enabled) {
        this.bgmAudio.volume = this.bgmVolume;
        // 停止中だった場合は再開
        if (this.bgmAudio.paused && this.currentBgm) {
          this.bgmAudio.play().catch(err => {
            console.warn('BGMの再開に失敗しました:', err);
          });
        }
      } else {
        this.bgmAudio.pause();
      }
    }
    
    console.log(`[DEBUG] BGMを${enabled ? '有効' : '無効'}にしました`);
  }

  /**
   * ユーザーインタラクション後に保留中のBGMを再生する
   * (ユーザークリックやタッチ等のイベントハンドラから呼び出す)
   */
  resumeBgmAfterInteraction() {
    if (this._pendingBgmName && this.bgmEnabled) {
      const name = this._pendingBgmName;
      this._pendingBgmName = null;
      this.playBgm(name);
    } else if (this.bgmAudio && this.bgmAudio.paused && this.bgmEnabled) {
      this.bgmAudio.play().catch(err => {
        console.warn('ユーザーインタラクション後のBGM再開に失敗しました:', err);
      });
    }

    // 同時にAudioContextも再開
    this.resume();
  }

  /**
   * AudioContextを再開する（ユーザージェスチャが必要な場合に使用）
   */
  resume() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.context) {
      return;
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(err => {
        console.error('AudioContextの再開に失敗:', err);
      });
    }
  }

  /**
   * 特定のサウンドをクリアして再読み込みする
   * @param {string} name - リロードするサウンドの名前
   * @returns {Promise} - ロード完了時に解決されるPromise
   */
  async reloadSound(name) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    console.log(`[DEBUG] サウンド「${name}」を再読み込みします...`);

    // 名前を小文字に統一
    const lowerName = name.toLowerCase();

    // バッファから削除
    if (this.sfxBuffers[lowerName]) {
      delete this.sfxBuffers[lowerName];
    }

    // プリセットも小文字で検索
    const presetKey = Object.keys(this.soundPresets).find(
      (key) => key.toLowerCase() === lowerName
    );

    // プリセットが存在する場合、再ロード
    if (presetKey) {
      try {
        await this.loadSound(lowerName, this.soundPresets[presetKey]);
        console.log(
          `[DEBUG] サウンド「${name}」を再読み込みしました: ${this.soundPresets[presetKey]}`
        );
        return true;
      } catch (error) {
        console.error(`サウンド「${name}」の再読み込みに失敗しました:`, error);
        return false;
      }
    } else {
      console.error(`サウンド「${name}」はプリセットに存在しません`);
      return false;
    }
  }

  /**
   * AudioContextを再作成する（サウンドシステムをリセット）
   */
  resetAudioContext() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return;
    }

    console.log('[DEBUG] AudioContextをリセットします...');

    try {
      // 古いコンテキストを閉じる
      if (this.context) {
        this.context
          .close()
          .catch((err) => console.error('AudioContextのクローズに失敗:', err));
      }

      // 新しいコンテキストを作成
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();

      // 新しいGainノードを作成
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
      this.gainNode.gain.value = this.sfxEnabled ? this.volume : 0;

      // バッファをクリア
      this.sfxBuffers = {};

      console.log('[DEBUG] AudioContextをリセットしました');

      // すべてのサウンドを再ロード
      this.initializeAllSounds();
    } catch (error) {
      console.error('AudioContextのリセットに失敗:', error);
    }
  }
}

// シングルトンインスタンスを作成
const soundSystem = new SoundUtils();

export default soundSystem;
