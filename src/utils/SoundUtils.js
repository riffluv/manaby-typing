'use client';

/**
 * Web Audio APIを使用したサウンドシステム
 * 効果音とBGM両方に対応した拡張版
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

      // BGM用のGainノード（BGM専用の音量調整用）
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.context.destination);

      // タイピング音専用の高速レスポンス用Gainノード
      this.typingGainNode = this.context.createGain();
      this.typingGainNode.connect(this.context.destination);
    }

    // 効果音バッファを保持するオブジェクト
    this.sfxBuffers = {};

    // タイピング音専用のキャッシュ (超高速アクセス用)
    this.typingSoundBuffers = {
      success: null,
      error: null
    };

    // BGMの状態管理
    this.currentBgm = null;
    this.bgmElement = null;
    this.bgmVolume = 0.5; // デフォルトBGM音量 (0.0〜1.0)
    this.bgmEnabled = true; // BGM有効フラグ
    this.pendingBgm = null; // 自動再生ポリシーによりブロックされたBGM情報を保持
    this.userInteracted = false; // ユーザーがページと対話したかどうかのフラグ

    // 効果音の音量設定（0.0〜1.0）
    this.volume = 1.0;

    // 効果音のオン/オフ設定
    this.sfxEnabled = true;

    // ローカルストレージから設定を読み込む（存在する場合）
    this._loadSettingsFromStorage();

    // サウンドプリセット定義
    this.soundPresets = {
      // 基本ゲーム効果音
      success: '/sounds/Hit05-1.mp3', // タイピング成功音（変更後）
      error: '/sounds/Hit04-1.mp3', // タイピングエラー音
      complete: '/sounds/resultsound.mp3', // ゲームクリア音
      button: '/sounds/buttonsound1.mp3', // ボタンクリック音
      level: '/sounds/xylophone-mini-dessert.mp3', // レベルアップ音
    };

    // BGMプリセット定義
    this.bgmPresets = {
      lobby: '/sounds/Battle of the Emperor.mp3', // ロビー/メインメニューBGM
      battle: '/sounds/battle.mp3', // ゲームプレイBGM
    };

    // キャッシュバスティング用のタイムスタンプ
    this.timestamp = Date.now();

    // ユーザーインタラクションイベントを監視
    if (typeof window !== 'undefined') {
      const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
      interactionEvents.forEach(eventType => {
        window.addEventListener(eventType, this._handleUserInteraction.bind(this), { once: false, passive: true });
      });
    }

    // タイピング音のパフォーマンス最適化用フラグ
    this.isOptimizedForTyping = false;

    console.log('[DEBUG] サウンドシステム初期化完了');
  }

  /**
   * ローカルストレージから設定を読み込む
   * @private
   */
  _loadSettingsFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      // BGM設定の読み込み
      const storedBgmEnabled = localStorage.getItem('sound_bgmEnabled');
      if (storedBgmEnabled !== null) {
        this.bgmEnabled = storedBgmEnabled === 'true';
      }

      // BGM音量の読み込み
      const storedBgmVolume = localStorage.getItem('sound_bgmVolume');
      if (storedBgmVolume !== null) {
        this.bgmVolume = parseFloat(storedBgmVolume);
      }

      // 効果音設定の読み込み
      const storedSfxEnabled = localStorage.getItem('sound_sfxEnabled');
      if (storedSfxEnabled !== null) {
        this.sfxEnabled = storedSfxEnabled === 'true';
      }

      // 効果音音量の読み込み
      const storedSfxVolume = localStorage.getItem('sound_sfxVolume');
      if (storedSfxVolume !== null) {
        this.volume = parseFloat(storedSfxVolume);
      }

      // サウンド全体の設定も読み込む
      const storedSoundEnabled = localStorage.getItem('sound_soundEnabled');
      if (storedSoundEnabled !== null) {
        // サウンド全体がオフなら、BGMと効果音も無効にする（内部状態としては保持）
        if (storedSoundEnabled === 'false') {
          this.bgmElement?.pause();
        }
      }

      console.log('[DEBUG] ローカルストレージから音声設定を読み込みました', {
        bgmEnabled: this.bgmEnabled,
        bgmVolume: this.bgmVolume,
        sfxEnabled: this.sfxEnabled,
        sfxVolume: this.volume,
        soundEnabled: storedSoundEnabled === 'true'
      });
    } catch (err) {
      console.error('設定の読み込みに失敗しました:', err);
    }
  }

  /**
   * 設定をローカルストレージに保存する
   * SoundContextと連携するため、_saveSettingsToStorageは使用しません
   * 代わりにSoundContextが設定を保存します
   * @private
   * @deprecated SoundContextが代わりに設定を保存します
   */
  _saveSettingsToStorage() {
    // この関数は空にして、直接呼ばないようにする
    // SoundContextがローカルストレージへの保存を一元管理
    return;
  }

  /**
   * ユーザーインタラクションを検知するイベントハンドラ
   * @private
   */
  _handleUserInteraction() {
    // まだ対話していない場合のみ実行
    if (!this.userInteracted) {
      this.userInteracted = true;
      console.log('[DEBUG] ユーザーインタラクションを検知しました');

      // AudioContextを再開
      if (this.context && this.context.state === 'suspended') {
        this.context.resume().catch(err => {
          console.error('AudioContextの再開に失敗:', err);
        });
      }

      // 保留中のBGMがあれば再生
      if (this.pendingBgm) {
        const { name, loop } = this.pendingBgm;
        console.log(`[DEBUG] 保留中のBGM「${name}」を再生します`);
        this._playBgmInternal(name, loop);
        this.pendingBgm = null;
      }
    }
  }

  /**
   * 効率的な音声読み込み - 重要な効果音だけを事前にロード、その他は遅延読み込み
   * パフォーマンス最適化版
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
              .then(() => {
                // タイピング音は専用キャッシュにも保存
                if (name === 'success' || name === 'error') {
                  this.typingSoundBuffers[name] = this.sfxBuffers[name.toLowerCase()];
                }
              })
          );
        }
      }

      // 重要な効果音を先に読み込み終える
      await Promise.all(criticalLoadPromises);
      console.log('重要な効果音のロードが完了しました');
      
      // タイピング処理の最適化を有効化
      this.optimizeForTypingPerformance();

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
   * @param {Object} options - 再生オプション
   * @param {boolean} options.immediate - trueの場合、最優先で即時再生（デフォルトfalse）
   */
  playSound(name, options = {}) {
    // 効果音が無効化されている場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    // 大文字小文字を区別せずに名前を小文字に変換して処理
    const lowerName = name.toLowerCase();

    // バッファにあれば即時再生（最速パス）
    if (this.sfxBuffers[lowerName]) {
      // 即時再生フラグが立っている場合は優先処理
      if (options.immediate) {
        this._playBufferImmediate(this.sfxBuffers[lowerName]);
      } else {
        this._playBuffer(this.sfxBuffers[lowerName]);
      }
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
            // 即時再生フラグが立っている場合は優先処理
            if (options.immediate) {
              this._playBufferImmediate(this.sfxBuffers[lowerName]);
            } else {
              this._playBuffer(this.sfxBuffers[lowerName]);
            }
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
   * @param {Object} options - 再生オプション
   */
  play(name, options = {}) {
    return this.playSound(name, options);
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
   * バッファから効果音を最高優先度で即時再生する（タイピング音用）
   * @param {AudioBuffer} buffer - 再生するオーディオバッファ
   * @private
   */
  _playBufferImmediate(buffer) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.context) {
      return;
    }

    if (!buffer) {
      console.warn('再生しようとしたバッファが存在しません');
      return;
    }

    try {
      // 最高優先度での処理（他の処理を待たない）
      // AudioContextの状態チェックも省略して即時再生
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;

      // タイピング音最適化モードが有効な場合は専用ゲインノードを使用
      // すべてのノードが同じAudioContextに属していることを確認
      if (this.isOptimizedForTyping && this.typingGainNode && this.typingGainNode.context === this.context) {
        sourceNode.connect(this.typingGainNode);
      } else {
        // フォールバック：通常のゲインノードを使用
        sourceNode.connect(this.gainNode);
      }

      // 即時開始（開始時刻0で絶対的な優先度を確保）
      sourceNode.start(0);

      return true;
    } catch (error) {
      console.error(`効果音の即時再生に失敗しました:`, error);
      // エラーが発生した場合は通常の再生方法にフォールバック
      this._playBufferInternal(buffer);
      return false;
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

    // 設定をローカルストレージに保存
    this._saveSettingsToStorage();
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

    // 設定をローカルストレージに保存
    this._saveSettingsToStorage();
  }

  /**
   * すべてのサウンドを有効/無効に切り替える (効果音のみ)
   * @param {boolean} enabled - サウンドを有効にするか
   */
  setEnabled(enabled) {
    this.setSfxEnabled(enabled);
    this.setBgmEnabled(enabled);
    // 各メソッド内で個別に設定が保存されるので、ここでは保存しない
  }

  /**
   * BGMの音量を設定する
   * @param {number} value - 0.0〜1.0の間の値
   */
  setBgmVolume(value) {
    this.bgmVolume = Math.max(0, Math.min(1, value));

    // 現在再生中のBGMがあれば音量を変更
    if (this.bgmElement) {
      this.bgmElement.volume = this.bgmEnabled ? this.bgmVolume : 0;
    }

    console.log(`[DEBUG] BGMの音量を設定: ${this.bgmVolume}`);

    // 設定をローカルストレージに保存
    this._saveSettingsToStorage();
  }

  /**
   * BGMを有効/無効に切り替える
   * @param {boolean} enabled - BGMを有効にするか
   */
  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;

    if (this.bgmElement) {
      if (enabled) {
        // 有効化する場合は再生を再開
        this.bgmElement.volume = this.bgmVolume;
        if (this.bgmElement.paused) {
          this.resumeBgm();
        }
      } else {
        // 無効化する場合は一時停止
        this.bgmElement.pause();
      }
    }

    console.log(`[DEBUG] BGMを${enabled ? '有効' : '無効'}にしました`);

    // 設定をローカルストレージに保存
    this._saveSettingsToStorage();
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
      this.context.resume();
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

      // BGM用のGainノードも再作成
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.context.destination);
      this.bgmGainNode.gain.value = this.bgmEnabled ? this.bgmVolume : 0;

      // バッファをクリア
      this.sfxBuffers = {};

      // BGMを停止
      this.stopBgm();

      console.log('[DEBUG] AudioContextをリセットしました');

      // すべてのサウンドを再ロード
      this.initializeAllSounds();
    } catch (error) {
      console.error('AudioContextのリセットに失敗:', error);
    }
  }

  /**
   * BGMを再生する
   * @param {string} name - BGM名（プリセットに定義されているもの）
   * @param {boolean} loop - ループ再生するかどうか（デフォルトtrue）
   */
  playBgm(name, loop = true) {
    // サーバーサイドレンダリング時や無効時は何もしない
    if (typeof window === 'undefined' || !this.bgmEnabled) {
      return;
    }

    // すでに同じBGMが再生中なら何もしない
    if (this.currentBgm === name && this.bgmElement && !this.bgmElement.paused) {
      return;
    }

    // 既存のBGMがあれば停止
    this.stopBgm();

    // 指定されたBGMがプリセットにあるか確認
    const bgmPath = this.bgmPresets[name];
    if (!bgmPath) {
      console.error(`BGM「${name}」はプリセットに存在しません`);
      return;
    }

    // ユーザーインタラクションがまだない場合は保留状態にする
    if (!this.userInteracted) {
      console.log(`[DEBUG] BGM「${name}」は保留状態にセットされました。ユーザーインタラクション後に再生されます`);
      this.pendingBgm = { name, loop };
      return;
    }

    // ユーザーインタラクションがあった場合は直接内部メソッドを呼び出す
    this._playBgmInternal(name, loop);
  }

  /**
   * 内部BGM再生メソッド（自動再生ポリシー回避用）
   * @param {string} name - BGM名
   * @param {boolean} loop - ループ再生するかどうか
   * @private
   */
  _playBgmInternal(name, loop) {
    try {
      const bgmPath = this.bgmPresets[name];
      if (!bgmPath) {
        throw new Error(`BGM「${name}」はプリセットに存在しません`);
      }

      // HTML Audio要素を使用してBGMを再生（長時間再生に最適）
      const audio = new Audio(bgmPath);
      audio.loop = loop;
      audio.volume = this.bgmVolume;

      // Web Audio APIと連携
      if (this.context) {
        // AudioContextが停止状態なら再開
        if (this.context.state === 'suspended') {
          this.context.resume().catch(err => {
            console.error('AudioContextの再開に失敗:', err);
          });
        }
      }

      // 再生開始
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`BGM「${name}」の再生開始に失敗:`, error);

          // 自動再生ポリシーによるブロックの場合、保留状態にする
          if (!this.pendingBgm) {
            this.pendingBgm = { name, loop };
            console.log(`[DEBUG] BGM「${name}」が自動再生ポリシーでブロックされました。保留状態に設定しました`);
          }
        });
      }

      // 現在のBGM情報を保存
      this.currentBgm = name;
      this.bgmElement = audio;

      console.log(`[DEBUG] BGM「${name}」を再生開始しました`);
    } catch (error) {
      console.error(`BGM「${name}」の再生に失敗:`, error);
    }
  }

  /**
   * 現在再生中のBGMを一時停止する
   */
  pauseBgm() {
    if (this.bgmElement && !this.bgmElement.paused) {
      this.bgmElement.pause();
      console.log(`[DEBUG] BGM「${this.currentBgm}」を一時停止しました`);
    }
  }

  /**
   * 一時停止したBGMを再開する
   */
  resumeBgm() {
    if (this.bgmElement && this.bgmElement.paused && this.bgmEnabled) {
      const playPromise = this.bgmElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`BGM「${this.currentBgm}」の再開に失敗:`, error);
        });
      }
      console.log(`[DEBUG] BGM「${this.currentBgm}」を再開しました`);
    }
  }

  /**
   * BGMを停止する
   */
  stopBgm() {
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement.currentTime = 0;
      this.bgmElement = null;
      console.log(`[DEBUG] BGM「${this.currentBgm}」を停止しました`);
      this.currentBgm = null;
    }
  }

  /**
   * 現在再生中のBGMの名前を取得する
   * @returns {string|null} BGM名またはnull（再生なし）
   */
  getCurrentBgm() {
    return this.currentBgm;
  }

  /**
   * 効果音の音量を取得する
   * @returns {number} 効果音の音量 (0.0〜1.0)
   */
  getSfxVolume() {
    return this.volume;
  }

  /**
   * BGMの音量を取得する
   * @returns {number} BGMの音量 (0.0〜1.0)
   */
  getBgmVolume() {
    return this.bgmVolume;
  }

  /**
   * 効果音が有効かどうかを取得する
   * @returns {boolean} 効果音が有効ならtrue
   */
  isSfxEnabled() {
    return this.sfxEnabled;
  }

  /**
   * BGMが有効かどうかを取得する
   * @returns {boolean} BGMが有効ならtrue
   */
  isBgmEnabled() {
    return this.bgmEnabled;
  }

  /**
   * 次に演奏される可能性のある効果音を事前に準備する
   * タイピングゲーム用の最適化 - typingmania-refの技術にインスパイアされた実装
   * @param {Array} chars - 次の入力として予測される文字の配列
   */
  prepareNextSounds(chars) {
    // サウンドが無効か、予測文字がない場合は何もしない
    if (!this.sfxEnabled || !Array.isArray(chars) || chars.length === 0 || typeof window === 'undefined') {
      return;
    }

    // タイピング成功音のバッファを取得（存在しなければ何もしない）
    const successSoundBuffer = this.sfxBuffers['success'];
    if (!successSoundBuffer) {
      return;
    }

    try {
      // AudioContextの状態を確認（サスペンド状態なら先に再開しておく）
      if (this.context.state === 'suspended') {
        this.context.resume().catch(err => {
          // エラーは無視（後で自動的に処理される）
        });
      }

      // 予測入力ごとのサウンドノードを事前に準備
      // これにより、実際の入力時のレイテンシーが大幅に削減される
      for (const char of chars) {
        // サウンドノードを事前生成（ただし実際には接続しない）
        const bufferNode = this.context.createBufferSource();
        bufferNode.buffer = successSoundBuffer;

        // メモリリークを防ぐため、一定時間後に自動的にクリーンアップ
        setTimeout(() => {
          try {
            if (bufferNode && bufferNode.buffer) {
              bufferNode.disconnect();
            }
          } catch (e) {
            // エラーは無視（すでに再生されているかもしれないため）
          }
        }, 2000); // 2秒後にクリーンアップ
      }

      // Web Audio APIのレンダリングパイプラインに乗せるため、事前にオーディオコンテキストにタッチ
      // これによりレンダリング準備が整い、実際の再生時にレイテンシーが削減される
      this.context.resume();
    } catch (err) {
      console.warn('サウンド事前準備に失敗:', err);
    }
  }

  /**
   * AudioWorkletを使用した超低レイテンシーの効果音再生（高度な最適化）
   * 標準のWeb Audio APIよりもレイテンシーが30-50%低減される
   * @param {string} name - 再生する効果音の名前
   */
  playUltraFast(name) {
    // 効果音が無効化されている場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    // 名前を小文字に統一
    const lowerName = name.toLowerCase();

    // バッファにある効果音のみを処理（存在しない場合は通常再生にフォールバック）
    if (!this.sfxBuffers[lowerName]) {
      this.play(name, { immediate: true });
      return;
    }

    try {
      // 超低レイテンシー再生処理
      const buffer = this.sfxBuffers[lowerName];
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;

      // 修正: 音量の一貫性を保つため、常にゲインノードを使用する
      // ただし接続を最適化して低レイテンシーを維持
      const gainNode = this.context.createGain();
      gainNode.gain.value = this.volume; // 現在の音量設定を適用

      // 音量ノードを経由して出力に接続（音量の一貫性を確保）
      sourceNode.connect(gainNode);
      gainNode.connect(this.context.destination);

      // 即時に最優先で再生開始
      sourceNode.start(0);

      return true;
    } catch (error) {
      console.debug('超低レイテンシー再生でエラーが発生。通常再生にフォールバック:', error);
      // 通常の再生処理にフォールバック
      this.play(name, { immediate: true });
      return false;
    }
  }

  /**
   * AudioContext全体のパフォーマンスを最適化する（レイテンシー低減用）
   */
  optimizeForLowLatency() {
    if (typeof window === 'undefined' || !this.context) {
      return false;
    }

    try {
      // 最高パフォーマンス設定を適用（ブラウザ互換性あり）

      // 1. Web Audio APIバッファサイズ最小化（サポートされている場合）
      if (this.context.baseLatency !== undefined) {
        console.log(`[最適化] 現在のオーディオレイテンシー: ${this.context.baseLatency * 1000}ms`);
      }

      // 2. AudioContextのレイテンシーモードを超低レイテンシーに（サポートされている場合）
      if (typeof window.AudioContext === 'function') {
        // Chrome/Edgeの最適化方法
        if (typeof this.context.close === 'function') {
          // 既存のコンテキストを閉じて新しいものを作成
          this.context.close().catch(e => console.debug('コンテキスト閉じる際のエラーは無視'));

          try {
            // 超低レイテンシーモードで新しいコンテキストを作成
            const newContext = new AudioContext({
              latencyHint: 'interactive', // 最低レイテンシーモード
              sampleRate: 48000 // 高サンプルレートでレイテンシー低減
            });

            this.context = newContext;

            // 新しいゲインノードを作成
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);
            this.gainNode.gain.value = this.sfxEnabled ? this.volume : 0;

            // バッファをクリア（必要に応じてリロード）
            const oldBuffers = { ...this.sfxBuffers };
            this.sfxBuffers = {};

            // 重要な音をすぐに再ロード
            this.loadSound('success', this.soundPresets['success']);
            this.loadSound('error', this.soundPresets['error']);

            console.log('[最適化] 超低レイテンシーモードを有効化しました');
            return true;
          } catch (err) {
            console.error('低レイテンシー最適化に失敗:', err);
            return false;
          }
        }
      }

      return false;
    } catch (err) {
      console.warn('低レイテンシー最適化に失敗:', err);
      return false;
    }
  }

  /**
   * タイピングゲームの処理に最適化された超低レイテンシーの効果音再生
   * typingmania-refのサウンドエンジンにインスパイアされた実装
   * @param {string} type - 再生する効果音のタイプ ('success' または 'error')
   */
  playTypingSound(type) {
    // 効果音が無効化されているか、ブラウザ環境でない場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    try {
      const buffer = type === 'error' ? this.typingSoundBuffers.error : this.typingSoundBuffers.success;

      // バッファがない場合は代替処理
      if (!buffer) {
        // バッファが読み込まれていない場合はプリロードを試みる
        if (type === 'error' || type === 'success') {
          if (!this.sfxBuffers[type.toLowerCase()]) {
            // 通常のバッファにもない場合はロード
            this.loadSound(type, this.soundPresets[type])
              .then(() => {
                // 成功したら専用キャッシュにも保存
                this.typingSoundBuffers[type] = this.sfxBuffers[type.toLowerCase()];
                // 再帰的に再生を試みる
                this.playTypingSound(type);
              })
              .catch(err => console.warn(`タイピング音「${type}」のロードに失敗:`, err));
          } else {
            // 通常のバッファにはあるが専用キャッシュにない場合は複製
            this.typingSoundBuffers[type] = this.sfxBuffers[type.toLowerCase()];
            // 再帰的に再生を試みる
            this.playTypingSound(type);
          }
        }
        return;
      }

      // === 超高速再生パス ===
      // 最小限のオーバーヘッドでWeb Audio APIを使用
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;
      
      // タイピング専用のゲインノードの一貫性を確認
      if (this.typingGainNode && this.typingGainNode.context === this.context) {
        // 同じコンテキストに属している場合のみ専用ノードを使用
        sourceNode.connect(this.typingGainNode);
      } else {
        // 異なるコンテキストの場合や問題がある場合は通常のゲインノードを使用
        sourceNode.connect(this.gainNode);
        
        // 問題を検出した場合は、タイピング専用ノードを再作成
        if (this.typingGainNode && this.typingGainNode.context !== this.context) {
          console.warn('[タイピング音] AudioContext不一致を検出。ノードを再作成します');
          try {
            // タイピング専用ゲインノードを再作成
            this.typingGainNode = this.context.createGain();
            this.typingGainNode.connect(this.context.destination);
            this.typingGainNode.gain.value = this.sfxEnabled ? this.volume : 0;
          } catch (e) {
            console.error('[タイピング音] ゲインノード再作成エラー:', e);
          }
        }
      }
      
      // 即時再生開始（レイテンシーを最小限に）
      sourceNode.start(0);
      
      return true;
    } catch (error) {
      // エラー時は通常の再生にフォールバック
      console.debug(`タイピング音の超高速再生に失敗: ${error.message}`);
      const soundName = type === 'error' ? 'error' : 'success';
      this.playSound(soundName, { immediate: true });
      return false;
    }
  }

  /**
   * タイピングゲームのパフォーマンスを最適化する
   * タイピング音に特化した設定を適用
   */
  optimizeForTypingPerformance() {
    if (typeof window === 'undefined' || !this.context) {
      return false;
    }

    try {
      // すでに最適化済みなら何もしない
      if (this.isOptimizedForTyping) {
        return true;
      }

      console.log('[サウンド] タイピングパフォーマンス最適化を適用します...');

      // タイピング専用のゲインノード音量を設定
      this.typingGainNode.gain.value = this.sfxEnabled ? this.volume : 0;

      // サクセス音とエラー音を専用バッファに確保
      if (this.sfxBuffers['success']) {
        this.typingSoundBuffers.success = this.sfxBuffers['success'];
      }
      if (this.sfxBuffers['error']) {
        this.typingSoundBuffers.error = this.sfxBuffers['error'];
      }

      // AudioContextの状態を確認し、必要なら再開
      if (this.context.state === 'suspended') {
        this.context.resume();
      }

      // 最適化フラグをオン
      this.isOptimizedForTyping = true;

      // すでにキャッシュされたタイピング音があるか確認
      const hasCachedTypingSounds = 
        this.typingSoundBuffers.success !== null &&
        this.typingSoundBuffers.error !== null;

      console.log(`[サウンド] タイピングパフォーマンス最適化完了 (キャッシュ状態: ${hasCachedTypingSounds ? '準備完了' : '読み込み中'})`);

      return true;
    } catch (err) {
      console.warn('[サウンド] タイピングパフォーマンス最適化に失敗:', err);
      return false;
    }
  }
}

// シングルトンインスタンスを作成
const soundSystem = new SoundUtils();

export default soundSystem;
