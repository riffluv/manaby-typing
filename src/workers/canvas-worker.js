/**
 * Offscreen Canvasワーカー
 * UIスレッドから分離されたバックグラウンドスレッドでキャンバス描画処理を実行
 */

// キャンバスコンテキスト
let canvas = null;
let ctx = null;

// アニメーションと描画設定
let animationFrameId = null;
let isRunning = false;
let lastTimestamp = 0;
let fps = 60;
let particleSystem = null;

// パーティクルアニメーション設定
const PARTICLE_COUNT = 100;
const GRAVITY = 0.1;
const DECAY_RATE = 0.96;
const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6'];
const MAX_SIZE = 5;
const MIN_SIZE = 2;

// パーティクルシステムの作成
function createParticleSystem() {
  const particles = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: 0,
      y: 0,
      vx: Math.random() * 10 - 5,
      vy: Math.random() * -10 - 2,
      size: Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 1.0
    });
  }

  return {
    particles,
    active: false,
    origin: { x: 0, y: 0 }
  };
}

// パーティクルの更新
function updateParticles() {
  if (!particleSystem || !particleSystem.active) return;

  let anyActive = false;

  particleSystem.particles.forEach(p => {
    if (p.life > 0.01) {
      // 物理演算更新
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY;
      p.life *= DECAY_RATE;
      anyActive = true;
    }
  });

  particleSystem.active = anyActive;
}

// パーティクルの描画
function drawParticles() {
  if (!ctx || !particleSystem || !particleSystem.active) return;

  particleSystem.particles.forEach(p => {
    if (p.life > 0.01) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(
        particleSystem.origin.x + p.x,
        particleSystem.origin.y + p.y,
        p.size * p.life,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  });
}

// キャンバスのクリア
function clearCanvas() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// アニメーションループ
function animationLoop(timestamp) {
  if (!isRunning) return;

  // フレームレート制御
  const elapsed = timestamp - lastTimestamp;
  if (elapsed < 1000 / fps) {
    animationFrameId = requestAnimationFrame(animationLoop);
    return;
  }

  lastTimestamp = timestamp;

  // キャンバスクリア
  clearCanvas();

  // パーティクル更新と描画
  updateParticles();
  drawParticles();

  // 次のフレーム
  animationFrameId = requestAnimationFrame(animationLoop);
}

// キャンバス設定関数
function setupCanvas() {
  if (!canvas || !ctx) return;

  // レティナディスプレイ対応
  const dpr = self.devicePixelRatio || 1;
  canvas.width = canvas.width * dpr;
  canvas.height = canvas.height * dpr;
  ctx.scale(dpr, dpr);

  // 描画設定
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
}

// メッセージハンドラ
self.onmessage = function (event) {
  const { type, data } = event.data;

  switch (type) {
    case 'init':
      // Offscreen Canvasの初期化
      canvas = data.canvas;
      ctx = canvas.getContext('2d');
      setupCanvas();
      particleSystem = createParticleSystem();
      self.postMessage({ type: 'initialized' });
      break;

    case 'start':
      // アニメーションの開始
      if (!isRunning && canvas && ctx) {
        isRunning = true;
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(animationLoop);
        self.postMessage({ type: 'started' });
      }
      break;

    case 'stop':
      // アニメーションの停止
      if (isRunning) {
        isRunning = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        self.postMessage({ type: 'stopped' });
      }
      break;

    case 'resize':
      // キャンバスサイズの変更
      if (canvas) {
        canvas.width = data.width;
        canvas.height = data.height;
        setupCanvas();
        self.postMessage({ type: 'resized' });
      }
      break;

    case 'spawn':
      // パーティクルの発生
      if (particleSystem) {
        particleSystem.origin.x = data.x;
        particleSystem.origin.y = data.y;
        particleSystem.active = true;

        // パーティクルの位置をリセット
        particleSystem.particles.forEach(p => {
          p.x = 0;
          p.y = 0;
          p.vx = Math.random() * 10 - 5;
          p.vy = Math.random() * -10 - 2;
          p.life = 1.0;
        });

        self.postMessage({ type: 'spawned' });
      }
      break;

    case 'fps':
      // フレームレートの設定
      fps = data.fps;
      self.postMessage({ type: 'fps_changed', fps });
      break;
  }
};