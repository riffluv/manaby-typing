'use client';

/**
 * Web Audio APIを使用した効果音システム
 * シンプル化したバージョン - キーごとの異なるサウンドを廃止
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

      // BGM用のGainノードを別途作成
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.context.destination);
    }

    // 効果音バッファを保持するオブジェクト
    this.sfxBuffers = {};

    // 効果音の音量設定（0.0〜1.0）
    this.volume = 1.0;

    // BGMの音量設定（0.0〜1.0）
    this.bgmVolume = 0.5;

    // 効果音のオン/オフ設定
    this.sfxEnabled = true;

    // BGMのオン/オフ設定
    this.bgmEnabled = true;

    // 現在再生中のBGM要素
    this.currentBgm = null;

    // サウンドプリセット定義 - シンプル化
    this.soundPresets = {
      // 基本ゲーム効果音
      success: '/sounds/Hit05-1.mp3', // タイピング成功音（変更後）
      error: '/sounds/Hit04-1.mp3', // タイピングエラー音
      complete: '/sounds/resultsound.mp3', // ゲームクリア音
      button: '/sounds/buttonsound1.mp3', // ボタンクリック音
      level: '/sounds/xylophone-mini-dessert.mp3', // レベルアップ音
    };

    // BGMプリセット
    this.bgmPresets = {
      title: '/sounds/xylophone-mini-dessert.mp3', // タイトル画面BGM
      game: '/sounds/battle.mp3', // ゲーム中BGM
      result: '/sounds/Battle of the Emperor.mp3', // リザルト画面BGM
    };

    // キャッシュバスティング用のタイムスタンプ
    this.timestamp = Date.now();

    console.log('[DEBUG] サウンドシステム初期化完了');
  }

  /**
   * すべての効果音を初期ロードする
   * @returns {Promise} ロード完了時に解決されるPromise
   */
  async initializeAllSounds() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    const loadPromises = [];
    for (const [name, url] of Object.entries(this.soundPresets)) {
      loadPromises.push(this.loadSound(name, url));
    }

    try {
      await Promise.all(loadPromises);
      console.log('すべての効果音を読み込みました');
      return true;
    } catch (error) {
      console.error('効果音の読み込みに失敗しました:', error);
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
   * 効果音を再生する (playSound と play の両方が同じ動作をする)
   * 大文字小文字を区別せずに処理する
   * @param {string} name - 再生する効果音の名前
   */
  playSound(name) {
    // 効果音が無効化されている場合は何もしない
    if (typeof window === 'undefined' || !this.sfxEnabled) {
      return;
    }

    // 大文字小文字を区別せずに名前を小文字に変換して処理
    const lowerName = name.toLowerCase();

    if (!this.sfxBuffers[lowerName]) {
      console.warn(
        `効果音「${name}」が登録されていません。自動ロードを試みます...`
      );

      // プリセットも小文字で検索
      const presetKey = Object.keys(this.soundPresets).find(
        (key) => key.toLowerCase() === lowerName
      );

      // 登録されていない場合、プリセットから自動ロードを試みる
      if (presetKey) {
        this.loadSound(lowerName, this.soundPresets[presetKey])
          .then(() => this._playBuffer(this.sfxBuffers[lowerName]))
          .catch((err) =>
            console.error(`自動ロード中にエラーが発生しました:`, err)
          );
      } else {
        console.error(`効果音「${name}」はプリセットにも存在しません`);
      }
      return;
    }

    this._playBuffer(this.sfxBuffers[lowerName]);
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
   * BGMを再生する
   * @param {string} name - 再生するBGMの名前またはURL
   * @param {boolean} loop - ループ再生するかどうか
   */
  playBgm(name, loop = true) {
    // サーバーサイドレンダリング時またはBGMが無効の場合は何もしない
    if (typeof window === 'undefined' || !this.bgmEnabled) {
      return;
    }

    // 現在のBGMを停止
    this.stopBgm();

    try {
      // 名前を小文字に統一
      const lowerName = name.toLowerCase();

      // プリセットからURLを取得
      let url = this.bgmPresets[lowerName] || name;

      // キャッシュバスティング
      const cacheBustedUrl = `${url}?t=${this.timestamp}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      console.log(`[DEBUG] BGM「${name}」を再生します: ${cacheBustedUrl}`);

      // Audio要素を作成
      const audio = new Audio(cacheBustedUrl);
      audio.loop = loop;
      audio.volume = this.bgmVolume;

      // Web Audio APIに接続
      if (this.context) {
        const source = this.context.createMediaElementSource(audio);
        source.connect(this.bgmGainNode);
      }

      // 再生開始
      audio.play().catch((error) => {
        console.error(`BGM「${name}」の再生に失敗しました:`, error);
      });

      // 参照を保存
      this.currentBgm = audio;
    } catch (error) {
      console.error(`BGMの再生に失敗しました:`, error);
    }
  }

  /**
   * 現在再生中のBGMを停止する
   */
  stopBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      this.currentBgm.currentTime = 0;
      this.currentBgm = null;
      console.log('[DEBUG] BGMを停止しました');
    }
  }

  /**
   * 現在再生中のBGMを一時停止する
   */
  pauseBgm() {
    if (this.currentBgm) {
      this.currentBgm.pause();
      console.log('[DEBUG] BGMを一時停止しました');
    }
  }

  /**
   * 一時停止したBGMを再開する
   */
  resumeBgm() {
    if (this.currentBgm) {
      this.currentBgm.play().catch((error) => {
        console.error('BGMの再開に失敗しました:', error);
      });
      console.log('[DEBUG] BGMを再開しました');
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
   * BGMの音量を設定する
   * @param {number} value - 0.0〜1.0の間の値
   */
  setBgmVolume(value) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.bgmGainNode) {
      return;
    }

    this.bgmVolume = Math.max(0, Math.min(1, value));

    // BGMが有効な場合のみ音量を設定
    if (this.bgmEnabled) {
      this.bgmGainNode.gain.value = this.bgmVolume;
    }

    // 現在再生中のBGM要素の音量も設定
    if (this.currentBgm) {
      this.currentBgm.volume = this.bgmVolume;
    }

    console.log(`[DEBUG] BGMの音量を設定: ${this.bgmVolume}`);
  }

  /**
   * 効果音の現在の音量を取得する
   * @returns {number} 0.0〜1.0の間の値
   */
  getSfxVolume() {
    return this.volume;
  }

  /**
   * BGMの現在の音量を取得する
   * @returns {number} 0.0〜1.0の間の値
   */
  getBgmVolume() {
    return this.bgmVolume;
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
   * BGMを有効/無効に切り替える
   * @param {boolean} enabled - BGMを有効にするか
   */
  setBgmEnabled(enabled) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined' || !this.bgmGainNode) {
      return;
    }

    this.bgmEnabled = enabled;
    this.bgmGainNode.gain.value = enabled ? this.bgmVolume : 0;

    if (!enabled && this.currentBgm) {
      this.pauseBgm();
    } else if (enabled && this.currentBgm) {
      this.resumeBgm();
    }

    console.log(`[DEBUG] BGMを${enabled ? '有効' : '無効'}にしました`);
  }

  /**
   * すべてのサウンド(効果音とBGM両方)を有効/無効に切り替える
   * @param {boolean} enabled - サウンドを有効にするか
   */
  setEnabled(enabled) {
    this.setSfxEnabled(enabled);
    this.setBgmEnabled(enabled);
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
      // BGMを停止
      this.stopBgm();

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

      // 新しいBGM用Gainノードを作成
      this.bgmGainNode = this.context.createGain();
      this.bgmGainNode.connect(this.context.destination);
      this.bgmGainNode.gain.value = this.bgmEnabled ? this.bgmVolume : 0;

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
