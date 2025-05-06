'use client';

/**
 * Web Audio APIを使用したサウンドシステム
 * BGMおよび基本的な効果音のみに対応したシンプル版
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
      success: '/sounds/Hit05-1.mp3', // タイピング成功音
      error: '/sounds/Hit04-1.mp3', // タイピングエラー音
      complete: '/sounds/resultsound.mp3', // ゲームクリア音
      button: '/sounds/buttonsound1.mp3', // ボタンクリック音
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

      console.log('[DEBUG] ローカルストレージから音声設定を読み込みました', {
        bgmEnabled: this.bgmEnabled,
        bgmVolume: this.bgmVolume,
        sfxEnabled: this.sfxEnabled,
        sfxVolume: this.volume
      });
    } catch (err) {
      console.error('設定の読み込みに失敗しました:', err);
    }
  }

  /**
   * 設定をローカルストレージに保存する
   * SoundContextと連携するためのインターフェース
   * @private
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
   * 基本的な効果音をロードする
   * @returns {Promise} ロード完了時に解決されるPromise
   */
  async initializeAllSounds() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    try {
      // 基本的な効果音のみをロード
      const basicSounds = ['success', 'error', 'button', 'complete'];
      const loadPromises = [];

      for (const name of basicSounds) {
        if (this.soundPresets[name]) {
          loadPromises.push(
            this.loadSound(name, this.soundPresets[name])
          );
        }
      }

      // すべての効果音を読み込む
      await Promise.all(loadPromises);
      console.log('基本的な効果音のロードが完了しました');
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
      const cacheBustedUrl = `${url}?t=${this.timestamp}`;
      console.log(`[DEBUG] サウンド「${name}」をロード中: ${cacheBustedUrl}`);

      const response = await fetch(cacheBustedUrl);
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
   * 効果音を再生する - シンプル版
   * @param {string} name - 再生する効果音の名前
   */
  playSound(name) {
    // 効果音が無効化されている場合や、サーバーサイドの場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    // 大文字小文字を区別せずに名前を小文字に変換して処理（最初に一度だけ処理）
    const lowerName = name.toLowerCase();
    
    // 多数の連続したリクエストを防ぐ（打撃音が詰まる問題の解決）
    const now = Date.now();
    
    // 最終再生時間の管理にはマップを使用
    if (!this._lastPlayTimes) this._lastPlayTimes = {};
    const lastPlayTime = this._lastPlayTimes[lowerName] || 0;
    
    // 同じ効果音の連続再生を防ぐための最小間隔（ミリ秒）
    // タイピング音は特に短く設定
    const minInterval = lowerName === 'success' ? 5 : 20;
    
    if (now - lastPlayTime < minInterval) {
      // 間隔が短すぎる場合はスキップ（パフォーマンス向上）
      return;
    }

    // 最終再生時間を記録
    this._lastPlayTimes[lowerName] = now;

    // バッファにあれば再生
    if (this.sfxBuffers[lowerName]) {
      this._playBuffer(this.sfxBuffers[lowerName]);
      return;
    }

    // バッファにない場合は読み込みを試みる
    const presetKey = Object.keys(this.soundPresets).find(
      (key) => key.toLowerCase() === lowerName
    );

    // 登録されていない場合、プリセットから自動ロードを試みる
    if (presetKey) {
      // AudioContextを再開（iOS Safari対策）
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
        .catch(() => {/* エラーログは削減 */});
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
      // AudioContextが停止状態なら再開
      if (this.context.state === 'suspended') {
        this.context.resume().catch((err) => {
          console.error('AudioContextの再開に失敗:', err);
        });
      }

      // パフォーマンス最適化: 再生ソースの管理を改善
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;

      // ゲインノードに接続（音量調整のため）
      sourceNode.connect(this.gainNode);

      // 効果音の再生とクリーンアップの最適化
      sourceNode.start(0);
      
      // 各ソースノードのクリーンアップ処理
      sourceNode.onended = () => {
        sourceNode.disconnect();
      };
      
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
   * すべてのサウンドを有効/無効に切り替える
   * @param {boolean} enabled - サウンドを有効にするか
   */
  setEnabled(enabled) {
    this.setSfxEnabled(enabled);
    this.setBgmEnabled(enabled);
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
