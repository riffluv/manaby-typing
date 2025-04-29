'use client';

import { gsap } from 'gsap';

// クラス定義をシンプルにする
class ComboEffectManager {
  constructor() {
    this.containerId = null;
    this.cubes = [];
    this.maxCubes = 10; // 最大同時表示キューブ数
    this.initialized = false;
    this.container = null;
    this.app = null;
    this.pendingEffects = [];

    // デバッグ用フラグ
    this.isDebugMode = true;
  }

  // 初期化メソッド - コンポーネントからuseEffectで呼び出す
  async setup(containerId) {
    if (this.initialized) return;

    this.containerId = containerId;

    try {
      // ブラウザ環境かチェック
      if (typeof window === 'undefined') {
        console.log(
          'ComboEffectManager: サーバーサイドではセットアップしません'
        );
        return;
      }

      // DOMが準備できているか確認
      const containerElement = document.getElementById(containerId);
      if (!containerElement) {
        console.log(
          'ComboEffectManager: コンテナが見つかりません',
          containerId
        );
        return;
      }

      if (this.isDebugMode) {
        console.log(
          'ComboEffectManager: コンテナが見つかりました',
          containerElement
        );
      }

      // PixiJSは動的インポートで読み込む
      const PIXI = await import('pixi.js');

      if (this.isDebugMode) {
        console.log('ComboEffectManager: PixiJSをインポートしました', PIXI);
      }

      // PixiJS v8対応のアプリケーション初期化
      this.app = new PIXI.Application({
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
      });

      if (this.isDebugMode) {
        console.log(
          'ComboEffectManager: PixiJSアプリケーションを作成しました',
          this.app
        );
      }

      // アプリケーションの初期化
      await this.app.init();

      if (this.isDebugMode) {
        console.log(
          'ComboEffectManager: アプリケーションを初期化しました',
          this.app.canvas
        );
      }

      // キャンバスをDOMに追加
      containerElement.appendChild(this.app.canvas);

      // キャンバスが見えるようにスタイルを調整（デバッグ用）
      if (this.isDebugMode) {
        this.app.canvas.style.zIndex = '200';
        this.app.canvas.style.border = '1px solid red';
      }

      // レンダラーのサイズをコンテナに合わせる
      this.app.renderer.resize(
        containerElement.offsetWidth,
        containerElement.offsetHeight
      );

      // コンテナを作成してステージに追加
      this.container = new PIXI.Container();
      this.app.stage.addChild(this.container);

      // イベントリスナーの設定
      this.onResizeHandler = this.onResize.bind(this);
      window.addEventListener('resize', this.onResizeHandler);

      // 初期化完了
      this.initialized = true;
      console.log('ComboEffectManager: 初期化成功');

      // 初期化テスト用のキューブを表示（デバッグ用）
      if (this.isDebugMode) {
        // 1秒後にテストキューブを表示
        setTimeout(() => {
          console.log('ComboEffectManager: テストキューブを表示します');
          this._createComboEffect(10);
        }, 1000);
      }

      // 保留中のエフェクトがあれば実行
      this.processPendingEffects();
    } catch (error) {
      console.error('ComboEffectManager: 初期化エラー', error);
    }
  }

  // リサイズハンドラ
  onResize() {
    if (!this.app) return;

    try {
      const containerElement = document.getElementById(this.containerId);
      if (!containerElement) return;

      this.app.renderer.resize(
        containerElement.offsetWidth,
        containerElement.offsetHeight
      );
    } catch (error) {
      console.warn('ComboEffectManager: リサイズエラー', error);
    }
  }

  // 保留中のエフェクトを処理
  processPendingEffects() {
    if (this.pendingEffects.length > 0 && this.initialized) {
      this.pendingEffects.forEach((comboCount) => {
        this._createComboEffect(comboCount);
      });
      this.pendingEffects = [];
    }
  }

  // ワイヤーフレームキューブの作成
  async createWireframeCube(size, color = 0xff8c00) {
    // ブラウザ環境チェック
    if (typeof window === 'undefined') return null;

    try {
      const PIXI = await import('pixi.js');
      const cube = new PIXI.Graphics();

      // 線のスタイル設定 - オレンジ色、やや細めの線
      cube.lineStyle(2, color, 1);

      // 前面（手前の四角形）
      cube.moveTo(0, 0);
      cube.lineTo(size, 0);
      cube.lineTo(size, size);
      cube.lineTo(0, size);
      cube.lineTo(0, 0);

      // 背面（奥の四角形）へのコネクタ
      cube.moveTo(0, 0);
      cube.lineTo(size / 3, -size / 3);

      cube.moveTo(size, 0);
      cube.lineTo(size + size / 3, -size / 3);

      cube.moveTo(size, size);
      cube.lineTo(size + size / 3, size - size / 3);

      cube.moveTo(0, size);
      cube.lineTo(size / 3, size - size / 3);

      // 背面（奥の四角形）
      cube.moveTo(size / 3, -size / 3);
      cube.lineTo(size + size / 3, -size / 3);
      cube.lineTo(size + size / 3, size - size / 3);
      cube.lineTo(size / 3, size - size / 3);
      cube.lineTo(size / 3, -size / 3);

      if (this.isDebugMode) {
        console.log('ComboEffectManager: キューブを作成しました', cube);
      }

      return cube;
    } catch (error) {
      console.error('ComboEffectManager: キューブ作成エラー', error);
      return null;
    }
  }

  // コンボ数に応じたエフェクトの表示 - コンポーネントから呼び出す
  showComboEffect(comboCount) {
    if (this.isDebugMode) {
      console.log('ComboEffectManager: showComboEffect呼び出し', {
        comboCount,
        initialized: this.initialized,
      });
    }

    // 初期化前なら保留中エフェクトに追加
    if (!this.initialized) {
      this.pendingEffects.push(comboCount);
      console.log(
        'ComboEffectManager: 初期化前なので保留中エフェクトに追加しました',
        this.pendingEffects
      );
      return;
    }

    // 初期化済みなら即時実行
    this._createComboEffect(comboCount);
  }

  // 実際にエフェクトを作成する内部メソッド
  async _createComboEffect(comboCount) {
    if (!this.initialized || !this.app || !this.container) {
      console.warn(
        'ComboEffectManager: 初期化が完了していないため、エフェクトを作成できません'
      );
      return;
    }

    if (this.isDebugMode) {
      console.log('ComboEffectManager: エフェクト作成開始', { comboCount });
    }

    // コンボ数に応じたキューブ数の決定
    let cubeCount = 1;
    if (comboCount >= 30) cubeCount = 3;
    else if (comboCount >= 20) cubeCount = 2;
    else if (comboCount >= 10) cubeCount = 1;
    else return; // 10コンボ未満はエフェクトなし

    try {
      // 画面サイズの取得
      const width = this.app.renderer.width;
      const height = this.app.renderer.height;

      if (this.isDebugMode) {
        console.log('ComboEffectManager: キャンバスサイズ', { width, height });
      }

      // PixiJS動的インポート
      const PIXI = await import('pixi.js');

      // キューブの生成と配置
      for (let i = 0; i < cubeCount; i++) {
        // 古いキューブを管理（最大数を超えないように）
        if (this.cubes.length >= this.maxCubes) {
          const oldCube = this.cubes.shift();
          if (oldCube && oldCube.parent) {
            oldCube.parent.removeChild(oldCube);
          }
        }

        // キューブサイズはcomboの大きさに応じて大きくなる（30〜100px）
        const size = Math.min(30 + comboCount / 2, 100);

        // 明るいオレンジ色の色合いをランダムに選択（レトロ感を出すための微妙なバリエーション）
        const orangeVariation = Math.floor(Math.random() * 3);
        const colors = [0xff8c00, 0xff7f00, 0xff9500]; // オレンジ色のバリエーション

        // キューブの作成
        const cube = await this.createWireframeCube(
          size,
          colors[orangeVariation]
        );
        if (!cube) {
          console.warn('ComboEffectManager: キューブの作成に失敗しました');
          continue;
        }

        // キューブの位置設定（画面の下部からランダムな横位置）
        cube.x = Math.random() * (width - 2 * size) + size;
        cube.y = height - size / 2;

        // キューブの回転角度をランダムに設定
        cube.rotation = (Math.random() * Math.PI) / 4; // 初期回転角度を小さめに

        // キューブに3D感を出すためのスケール設定
        cube.scale.set(1, 1);

        if (this.isDebugMode) {
          console.log('ComboEffectManager: キューブ設定', {
            index: i,
            size,
            x: cube.x,
            y: cube.y,
            rotation: cube.rotation,
          });
        }

        // コンテナにキューブを追加
        this.container.addChild(cube);
        this.cubes.push(cube);

        if (this.isDebugMode) {
          console.log('ComboEffectManager: コンテナ状態', {
            childCount: this.container.children.length,
            cubesInArray: this.cubes.length,
          });
        }

        // デバッグ用にレンダラーを強制更新
        if (this.isDebugMode) {
          this.app.render();
        }

        // GSAPでアニメーション（ふわっと上昇して消える）
        gsap.to(cube, {
          y: height * 0.3 + Math.random() * height * 0.3, // 画面の30%〜60%の高さまで上昇
          alpha: 0, // 透明になるまでフェードアウト
          rotation:
            cube.rotation +
            Math.PI *
              (Math.random() * 0.5 + 0.5) *
              (Math.random() > 0.5 ? 1 : -1), // ゆっくり回転
          scale: 1.5, // サイズをゆっくり大きく
          duration: 2.5 + Math.random(), // 2.5〜3.5秒かけてゆっくりアニメーション
          ease: 'power1.out',
          onUpdate: () => {
            // アニメーション中も定期的にレンダリングを更新（デバッグ用）
            if (this.isDebugMode && Math.random() < 0.05) {
              this.app.render();
            }
          },
          onComplete: () => {
            // アニメーション完了後、キューブを削除
            if (cube.parent) {
              cube.parent.removeChild(cube);
              if (this.isDebugMode) {
                console.log('ComboEffectManager: キューブを削除しました');
              }
            }

            // キューブ配列から削除
            const index = this.cubes.indexOf(cube);
            if (index > -1) {
              this.cubes.splice(index, 1);
            }
          },
        });
      }
    } catch (error) {
      console.error(
        'ComboEffectManager: エフェクト表示中にエラーが発生しました',
        error
      );
    }
  }

  // クリーンアップ（ページ遷移時などに呼び出す）
  destroy() {
    if (!this.initialized) return;

    // リスナーを先に削除
    if (this.onResizeHandler) {
      try {
        window.removeEventListener('resize', this.onResizeHandler);
        this.onResizeHandler = null;
      } catch (e) {
        // リスナー削除エラーを無視
      }
    }

    // キューブの削除
    if (this.cubes && this.cubes.length) {
      this.cubes.forEach((cube) => {
        try {
          if (cube && cube.parent) {
            cube.parent.removeChild(cube);
          }
        } catch (e) {
          // キューブ削除エラーを無視
        }
      });
      this.cubes = [];
    }

    // コンテナのクリーンアップ
    if (this.container) {
      try {
        if (this.app && this.app.stage) {
          this.app.stage.removeChild(this.container);
        }
      } catch (e) {
        // コンテナ削除エラーを無視
      }
      this.container = null;
    }

    // アプリケーションの破棄
    if (this.app) {
      try {
        // v8対応の破棄処理
        this.app.destroy();
      } catch (error) {
        console.warn(
          'ComboEffectManager: アプリケーション破棄中にエラーが発生しました',
          error
        );
      }
      this.app = null;
    }

    this.initialized = false;
    this.pendingEffects = [];
  }
}

// シングルトンインスタンスとしてエクスポート
const comboEffectManager = new ComboEffectManager();

export default comboEffectManager;
