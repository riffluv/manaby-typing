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
    }

    // 効果音バッファを保持するオブジェクト
    this.sfxBuffers = {};

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
}

// シングルトンインスタンスを作成
const soundSystem = new SoundUtils();

export default soundSystem;
