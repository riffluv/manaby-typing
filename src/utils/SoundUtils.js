'use client';

import { getStaticPath } from './StaticPathUtils';

/**
 * デバッグログフラグ - GitHub Pages環境では有効化
 */
let DEBUG_SOUND_UTILS = process.env.NODE_ENV === 'development' && false;

// GitHub Pages環境では強制的にデバッグを有効化
if (typeof window !== 'undefined') {
  window.__DEBUG_STATIC_PATH = false; // スタティックパスのデバッグ

  // GitHub Pages環境かどうかをチェック
  const isGitHubPages =
    window.location && window.location.hostname.includes('github.io');
  if (isGitHubPages) {
    DEBUG_SOUND_UTILS = true;
    window.__DEBUG_STATIC_PATH = true;
    console.log('GitHub Pages環境を検出、拡張デバッグログを有効化します');
  }
}

/**
 * ログユーティリティ - コンソールログを条件付きにする
 */
const logUtil = {
  debug: (message, ...args) => {
    if (DEBUG_SOUND_UTILS) console.log('[SoundDebug]', message, ...args);
  },
  warn: (message, ...args) => {
    console.warn('[Sound]', message, ...args);
  },
  error: (message, ...args) => {
    console.error('[Sound]', message, ...args);
  },
};

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
    this.bgmEnabled = false; // BGM有効フラグ（デフォルトではオフ）
    this.pendingBgm = null; // 自動再生ポリシーによりブロックされたBGM情報を保持
    this.userInteracted = false; // ユーザーがページと対話したかどうかのフラグ

    // 効果音の音量設定（0.0〜1.0）
    this.volume = 1.0;

    // 効果音のオン/オフ設定
    this.sfxEnabled = true; // ローカルストレージから設定を読み込む（存在する場合）    this._loadSettingsFromStorage();    // サウンドプリセット定義
    this.soundPresets = {
      // 基本ゲーム効果音 - 実際のファイル名に合わせて（大文字で定義）
      success: getStaticPath('/sounds/Hit05-1.mp3'), // タイピング成功音
      error: getStaticPath('/sounds/Hit04-1.mp3'), // タイピングエラー音
      complete: getStaticPath('/sounds/resultsound.mp3'), // ゲームクリア音
      clear: getStaticPath('/sounds/resultsound.mp3'), // ゲームクリア音（別名）
      button: getStaticPath('/sounds/buttonsound1.mp3'), // ボタンクリック音
    }; // GitHub Pages向けに追加デバッグ情報（デプロイ環境）
    if (DEBUG_SOUND_UTILS) {
      logUtil.debug('環境情報:', {
        NODE_ENV: process.env.NODE_ENV,
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || '未設定',
        例示パス: getStaticPath('/sounds/buttonsound1.mp3'), // 存在するファイルを参照
      });
    } // BGMプリセット定義
    this.bgmPresets = {
      lobby: getStaticPath('/sounds/battle_of_the_emperor.mp3'), // ロビー/メインメニューBGM
      battle: getStaticPath('/sounds/battle.mp3'), // ゲームプレイBGM
    };

    // キャッシュバスティング用のタイムスタンプ
    this.timestamp = Date.now();

    // ユーザーインタラクションイベントを監視
    if (typeof window !== 'undefined') {
      const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'click'];
      interactionEvents.forEach((eventType) => {
        window.addEventListener(
          eventType,
          this._handleUserInteraction.bind(this),
          { once: false, passive: true }
        );
      });
    }

    logUtil.debug('サウンドシステム初期化完了');
  }

  /**
   * ファイル名の大文字小文字に対応するパス取得ヘルパー
   * @param {string} primaryName - 優先するファイル名（大文字）
   * @param {string} fallbackName - フォールバックファイル名（小文字）
   * @returns {string} 適切なファイルパス
   * @private
   */
  _getSoundPathWithFallback(primaryName, fallbackName) {
    // プライマリとフォールバックの両方のパスを生成
    const primaryPath = getStaticPath(`/sounds/${primaryName}`);
    const fallbackPath = getStaticPath(`/sounds/${fallbackName}`);

    // Vercel環境では小文字のパスを優先
    const isVercel =
      typeof process !== 'undefined' &&
      process.env &&
      process.env.VERCEL === '1';
    if (isVercel) {
      if (DEBUG_SOUND_UTILS)
        logUtil.debug(`Vercel環境検出: ${fallbackPath} を使用`);
      return fallbackPath;
    }

    // GitHub Pages環境では大文字のパスを優先
    if (DEBUG_SOUND_UTILS) logUtil.debug(`非Vercel環境: ${primaryPath} を使用`);
    return primaryPath;
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

      logUtil.debug('ローカルストレージから音声設定を読み込みました', {
        bgmEnabled: this.bgmEnabled,
        bgmVolume: this.bgmVolume,
        sfxEnabled: this.sfxEnabled,
        sfxVolume: this.volume,
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
      logUtil.debug('ユーザーインタラクションを検知しました');

      // AudioContextを再開
      if (this.context && this.context.state === 'suspended') {
        this.context.resume().catch((err) => {
          console.error('AudioContextの再開に失敗:', err);
        });
      }

      // 保留中のBGMがあれば再生
      if (this.pendingBgm) {
        const { name, loop } = this.pendingBgm;
        logUtil.debug(`保留中のBGM「${name}」を再生します`);
        this._playBgmInternal(name, loop);
        this.pendingBgm = null;
      }
    }
  }
  /**
   * 基本的な効果音をロードする
   * @returns {Promise} ロード完了時に解決されるPromise
   */ async initializeAllSounds() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    try {
      // 基本的な効果音のみをロード - タイピング中の効果音を優先
      const prioritySounds = ['success', 'error']; // 最優先の効果音
      const secondarySounds = ['button', 'complete']; // 二次的な効果音
      const loadPromises = []; // 各音声ファイルのパスをログ出力
      if (DEBUG_SOUND_UTILS) {
        logUtil.debug('サウンドプリセット:', {
          success: this.soundPresets.success,
          error: this.soundPresets.error,
          button: this.soundPresets.button,
          complete: this.soundPresets.complete,
        });
      }

      // 優先度の高い音声を先に順次ロード
      for (const name of prioritySounds) {
        if (this.soundPresets[name]) {
          try {
            await this.loadSound(name, this.soundPresets[name]);
            if (DEBUG_SOUND_UTILS)
              logUtil.debug(`優先${name}音声のロードに成功しました`);
          } catch (err) {
            console.error(`優先${name}音声のロードに失敗しました:`, err);
          }
        }
      }

      // 2次的な音声は並列ロード
      for (const name of secondarySounds) {
        if (this.soundPresets[name]) {
          loadPromises.push(
            this.loadSound(name, this.soundPresets[name])
              .then(
                () =>
                  DEBUG_SOUND_UTILS &&
                  logUtil.debug(`${name}音声のロードに成功しました`)
              )
              .catch((err) =>
                console.error(`${name}音声のロードに失敗しました:`, err)
              )
          );
        }
      }

      // すべての効果音を読み込む
      await Promise.all(loadPromises);
      if (DEBUG_SOUND_UTILS)
        logUtil.debug('基本的な効果音のロードが完了しました');
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
   */ async loadSound(name, url) {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }

    try {
      // 名前を小文字に統一して処理
      const lowerName = name.toLowerCase();

      // 本番環境では音声ファイルをキャッシュ利用（キャッシュバスティングなし）
      // 開発環境のみタイムスタンプを使用
      const cacheBustedUrl =
        process.env.NODE_ENV === 'production'
          ? url
          : `${url}?t=${this.timestamp}`;
      if (DEBUG_SOUND_UTILS) {
        logUtil.debug(`サウンド「${name}」をロード中: ${cacheBustedUrl}`);
        // GitHub Pages対策：フェッチリクエストで詳細なエラーログ
        logUtil.debug(`${name}の読み込み開始: ${cacheBustedUrl}`);
      }

      // 最初に通常のURLで試行
      let response = await fetch(cacheBustedUrl); // 大文字小文字の問題を検出して対処する試み
      if (!response.ok) {
        console.warn(
          `${name}のロードに失敗 (${response.status})。代替URLで再試行...`
        );

        // 代替URL試行 - URLに含まれるファイル名部分の最初の文字を大文字/小文字に変更
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // 代替ファイル名で再試行
        let alternateFileName = fileName;
        if (fileName.startsWith('hit') && fileName.endsWith('.mp3')) {
          // 小文字から大文字へ
          alternateFileName = 'H' + fileName.substring(1);
        } else if (fileName.startsWith('Hit') && fileName.endsWith('.mp3')) {
          // 大文字から小文字へ
          alternateFileName = 'h' + fileName.substring(1);
        }

        if (alternateFileName !== fileName) {
          urlParts[urlParts.length - 1] = alternateFileName;
          const alternateUrl = urlParts.join('/') + `?t=${this.timestamp}`;
          if (DEBUG_SOUND_UTILS)
            logUtil.debug(`代替URL試行: ${alternateUrl} (元: ${fileName})`);

          response = await fetch(alternateUrl);
        }
      }

      if (!response.ok) {
        console.error(
          `${name}のHTTPエラー:`,
          response.status,
          response.statusText
        );
        throw new Error(
          `HTTP error! status: ${response.status}, url: ${cacheBustedUrl}`
        );
      }

      if (DEBUG_SOUND_UTILS) logUtil.debug(`${name}のレスポンス取得成功`);
      const arrayBuffer = await response.arrayBuffer();
      if (DEBUG_SOUND_UTILS) {
        logUtil.debug(
          `${name}のバッファ取得成功:`,
          arrayBuffer.byteLength,
          'bytes'
        );
      }

      // 音声データをデコード
      return new Promise((resolve, reject) => {
        try {
          this.context.decodeAudioData(
            arrayBuffer,
            (audioBuffer) => {
              this.sfxBuffers[lowerName] = audioBuffer;
              if (DEBUG_SOUND_UTILS)
                logUtil.debug(`サウンド「${name}」のロード・デコード完了`);
              resolve();
            },
            (error) => {
              console.error(`サウンド「${name}」のデコードに失敗:`, error);
              reject(error);
            }
          );
        } catch (decodeError) {
          console.error(`サウンド「${name}」のデコード処理例外:`, decodeError);
          reject(decodeError);
        }
      });
    } catch (error) {
      console.error(`効果音「${name}」のロード中にエラー発生:`, error);
      // エラーを投げず、代わりにフォールバックで空のバッファを設定
      this.sfxBuffers[name.toLowerCase()] = null;
      return Promise.resolve(); // ロード失敗してもアプリが動作し続けるように
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

    try {
      // タイピング関連音の処理を最適化
      const isTypingSound =
        lowerName === 'success' ||
        lowerName === 'error' ||
        lowerName === 'miss';

      if (isTypingSound) {
        // タイピング音は特別処理（より高速かつ低レイテンシー）
        // 多数の連続したリクエストを防ぎつつ、レスポンシブさは維持
        const now = Date.now();
        if (!this._lastPlayTimes) this._lastPlayTimes = {};
        const lastPlayTime = this._lastPlayTimes[lowerName] || 0;

        // タイピング音の最小再生間隔を調整（さらに短く）
        const minInterval = 3; // 3ミリ秒まで短縮

        if (now - lastPlayTime < minInterval) {
          // 間隔が短すぎる場合はスキップ（パフォーマンス向上）
          return;
        }

        // 最終再生時間を記録
        this._lastPlayTimes[lowerName] = now;

        // バッファにあればすぐに再生（最適化パス）
        if (this.sfxBuffers[lowerName]) {
          this._fastPlayBuffer(this.sfxBuffers[lowerName]);
          return;
        }
      } else {
        // 通常の効果音
        const now = Date.now();
        if (!this._lastPlayTimes) this._lastPlayTimes = {};
        const lastPlayTime = this._lastPlayTimes[lowerName] || 0;

        // 通常の効果音は従来の間隔を維持
        const minInterval = 20;

        if (now - lastPlayTime < minInterval) {
          return;
        }

        // 最終再生時間を記録
        this._lastPlayTimes[lowerName] = now;
      }

      // バッファにあれば再生
      if (this.sfxBuffers[lowerName]) {
        this._playBuffer(this.sfxBuffers[lowerName]);
        return;
      }

      // AudioContextの状態確認と再開（特にiOS/Safari対策）
      if (this.context && this.context.state === 'suspended') {
        this.context
          .resume()
          .catch((e) => console.warn('AudioContext再開失敗:', e));
      }

      // バッファにない場合は読み込みを試みる
      const presetKey = Object.keys(this.soundPresets).find(
        (key) => key.toLowerCase() === lowerName
      );

      // 登録されていない場合、プリセットから自動ロードを試みる
      if (presetKey) {
        // GitHub Pages対応：デバッグログ追加
        const soundUrl = this.soundPresets[presetKey];
        if (DEBUG_SOUND_UTILS)
          logUtil.debug(`${name}サウンド自動ロード開始:`, soundUrl);

        // 遅延読み込みを開始し、ロード完了後に再生
        this.loadSound(lowerName, soundUrl)
          .then(() => {
            if (DEBUG_SOUND_UTILS)
              logUtil.debug(`${name}サウンドのロードに成功、再生を試みます`);
            // ロード完了後すぐに再生
            if (this.sfxBuffers[lowerName]) {
              this._playBuffer(this.sfxBuffers[lowerName]);
            }
          })
          .catch((err) => {
            console.error(`${name}サウンドのロードに失敗:`, err);
            // エラー時のフォールバック - サウンドがないことをユーザーに表示しない
          });
      } else {
        console.warn(`未知のサウンド名が指定されました: ${name}`);
      }
    } catch (error) {
      // 最外部のエラーハンドラ - アプリが停止しないようにする
      console.error('プレイサウンドエラー:', error);
    }
  }

  /**
   * バッファから効果音を高速再生する（タイピング音用の最適化版）
   * @param {AudioBuffer} buffer - 再生するオーディオバッファ
   * @private
   */
  _fastPlayBuffer(buffer) {
    // サーバーサイド時やバッファがない場合は何もしない
    if (typeof window === 'undefined' || !this.context || !buffer) {
      return;
    }

    try {
      // 最小限の処理でソースノードを作成
      const sourceNode = this.context.createBufferSource();
      sourceNode.buffer = buffer;

      // ゲインノードに直接接続（処理ステップを削減）
      sourceNode.connect(this.gainNode);

      // 即時再生開始
      sourceNode.start(0);

      // オンエンドハンドラを設定せず、自動クリーンアップに任せる
      // （接続解除の明示的コールバックを省略してCPU負荷を削減）

      return true;
    } catch (error) {
      // 障害時のみエラーログ出力
      if (process.env.NODE_ENV === 'development') {
        console.error(`効果音の高速再生に失敗:`, error);
      }
      return false;
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
      // AudioContextが停止状態なら即時再開を試みる（最大3回）
      if (this.context.state === 'suspended') {
        // 直ちに再開を試みる（非同期処理）
        const resumePromise = this.context.resume().catch((err) => {
          console.warn('AudioContext再開に失敗(1回目):', err);
          // 再度試行
          return this.context.resume().catch((err2) => {
            console.warn('AudioContext再開に失敗(2回目):', err2);
            // 3回目の試行
            return this.context.resume().catch((err3) => {
              console.error('AudioContext再開に失敗(最終):', err3);
            });
          });
        });

        // 再生処理は再開の結果を待たずに続行（ユーザー体験優先）
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
      // GitHub Pages対応：より詳細なエラー情報
      console.error(`効果音の再生に失敗:`, {
        error: error.toString(),
        contextState: this.context ? this.context.state : 'unknown',
        bufferSize: buffer ? buffer.length : 'null',
        stack: error.stack,
      });
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
    logUtil.debug(`効果音の音量を設定: ${this.volume}`);
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
    logUtil.debug(`効果音を${enabled ? '有効' : '無効'}にしました`);
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

    logUtil.debug(`BGMの音量を設定: ${this.bgmVolume}`);
  }
  /**
   * BGMを有効/無効に切り替える
   * @param {boolean} enabled - BGMを有効にするか
   */
  setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;

    if (enabled) {
      // 有効化する場合
      if (this.bgmElement) {
        // BGM要素が存在する場合は再生を再開
        this.bgmElement.volume = this.bgmVolume;
        if (this.bgmElement.paused) {
          this.resumeBgm();
        }
      }
    } else {
      // 無効化する場合は完全に停止
      this.stopBgm();
    }

    logUtil.debug(`BGMを${enabled ? '有効' : '無効'}にしました`);
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
      // BGMが無効の場合は、既存のBGMを確実に停止する
      this.stopBgm();
      return;
    }

    // すでに同じBGMが再生中なら何もしない
    if (
      this.currentBgm === name &&
      this.bgmElement &&
      !this.bgmElement.paused
    ) {
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
      logUtil.debug(
        `BGM「${name}」は保留状態にセットされました。ユーザーインタラクション後に再生されます`
      );
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
      } // HTML Audio要素を使用してBGMを再生（長時間再生に最適）
      // bgmPathはすでにgetStaticPath()を通して取得しているので、そのまま使用可能
      const audio = new Audio(bgmPath);
      audio.loop = loop;
      audio.volume = this.bgmVolume;

      // Web Audio APIと連携
      if (this.context) {
        // AudioContextが停止状態なら再開
        if (this.context.state === 'suspended') {
          this.context.resume().catch((err) => {
            console.error('AudioContextの再開に失敗:', err);
          });
        }
      }

      // 再生開始
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error(`BGM「${name}」の再生開始に失敗:`, error);

          // 自動再生ポリシーによるブロックの場合、保留状態にする
          if (!this.pendingBgm) {
            this.pendingBgm = { name, loop };
            logUtil.debug(
              `BGM「${name}」が自動再生ポリシーでブロックされました。保留状態に設定しました`
            );
          }
        });
      }

      // 現在のBGM情報を保存
      this.currentBgm = name;
      this.bgmElement = audio;

      logUtil.debug(`BGM「${name}」を再生開始しました`);
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
      logUtil.debug(`BGM「${this.currentBgm}」を一時停止しました`);
    }
  }

  /**
   * 一時停止したBGMを再開する
   */
  resumeBgm() {
    if (this.bgmElement && this.bgmElement.paused && this.bgmEnabled) {
      const playPromise = this.bgmElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error(`BGM「${this.currentBgm}」の再開に失敗:`, error);
        });
      }
      logUtil.debug(`BGM「${this.currentBgm}」を再開しました`);
    }
  }
  /**
   * BGMを停止する
   */
  stopBgm() {
    // BGM要素がなくても状態をリセットする
    if (this.bgmElement) {
      this.bgmElement.pause();
      this.bgmElement.currentTime = 0;
      this.bgmElement = null;
      logUtil.debug(`BGM「${this.currentBgm}」を停止しました`);
    }

    // 常にcurrentBgmをリセットする（bgmElementがない場合も）
    if (this.currentBgm) {
      this.currentBgm = null;
    }

    // pendingBgmもリセット
    if (this.pendingBgm) {
      this.pendingBgm = null;
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
   * 指定されたパスの音声ファイルが存在するか確認する
   * @param {string} url - 音声ファイルのURL
   * @returns {Promise<boolean>} - ファイルが存在するならtrue
   */
  async checkSoundFileExists(url) {
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn(`ファイル存在確認エラー (${url}):`, error);
      return false;
    }
  }

  /**
   * バージョン情報の確認（デバッグ用）
   * @returns {Object} バージョン情報
   */
  getVersionInfo() {
    return {
      version: '1.0.1',
      buildDate: '2025-05-14',
      environment: process.env.NODE_ENV,
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || 'なし',
      useMCP: process.env.NEXT_PUBLIC_USE_MCP === 'true',
      audioContext: this.context
        ? {
            state: this.context.state,
            sampleRate: this.context.sampleRate,
          }
        : 'なし',
    };
  }

  /**
   * 音声ファイルの自動診断（GitHub Pages対応）
   * @returns {Promise<Object>} 診断結果
   */
  async diagnoseAudioSystem() {
    if (typeof window === 'undefined') {
      return { status: 'server_side' };
    }

    const results = {
      audioContext: !!this.context,
      contextState: this.context ? this.context.state : 'none',
      userInteracted: this.userInteracted,
      sfxEnabled: this.sfxEnabled,
      gainValue: this.gainNode ? this.gainNode.gain.value : 'none',
      loadedBuffers: Object.keys(this.sfxBuffers),
      fileChecks: {},
    };

    // 重要な音声ファイルの存在チェック
    const filesToCheck = ['success', 'error', 'button', 'complete'];

    for (const name of filesToCheck) {
      const url = this.soundPresets[name];
      if (url) {
        results.fileChecks[name] = {
          url,
          exists: await this.checkSoundFileExists(url),
        };
      }
    }

    return results;
  }

  // AudioContextを取得（外部診断用）
  getAudioContext() {
    return this.context;
  }
}

// シングルトンインスタンスを作成
const soundSystem = new SoundUtils();

export default soundSystem;
