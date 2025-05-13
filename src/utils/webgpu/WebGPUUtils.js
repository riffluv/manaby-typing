/**
 * Web GPU関連のユーティリティクラス
 * グラフィック描画の高速化とハードウェアアクセラレーションを実現
 */

// Web GPUの対応状況とデバイス
let gpuDevice = null;
let isSupported = false;
let isInitialized = false;
let adapter = null;
let initPromise = null;

/**
 * Web GPUが利用可能かどうかを確認
 * @returns {boolean} サポート状況
 */
export function isWebGPUSupported() {
  if (typeof navigator === 'undefined') return false;
  return isSupported || 'gpu' in navigator;
}

/**
 * Web GPUデバイスを初期化
 * @returns {Promise<GPUDevice|null>} 初期化されたGPUデバイス、または非対応の場合はnull
 */
export async function initWebGPU() {
  // 既に初期化済みまたは進行中の場合は既存のPromiseを返す
  if (isInitialized) return gpuDevice;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!isWebGPUSupported()) {
        console.warn('[WebGPU] ブラウザがWeb GPUをサポートしていません');
        return null;
      }

      // アダプターの取得
      adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.warn('[WebGPU] 対応するGPUアダプターが見つかりませんでした');
        return null;
      }

      // GPUデバイスの取得
      gpuDevice = await adapter.requestDevice();

      // エラー発生時のハンドリング
      gpuDevice.lost.then((info) => {
        console.error(`[WebGPU] デバイスが失われました: ${info.message}`);
        isInitialized = false;
        gpuDevice = null;
      });

      isSupported = true;
      isInitialized = true;

      console.log('[WebGPU] 初期化完了:', {
        adapterInfo: await adapter.requestAdapterInfo(),
        features: [...gpuDevice.features].join(', '),
        limits: {
          maxBindGroups: gpuDevice.limits.maxBindGroups,
          maxStorageBufferSize: gpuDevice.limits.maxStorageBufferSize,
          maxComputeWorkgroupSizeX: gpuDevice.limits.maxComputeWorkgroupSizeX,
          maxComputeWorkgroupSizeY: gpuDevice.limits.maxComputeWorkgroupSizeY,
          maxComputeWorkgroupSizeZ: gpuDevice.limits.maxComputeWorkgroupSizeZ
        }
      });

      return gpuDevice;
    } catch (err) {
      console.error('[WebGPU] 初期化エラー:', err);
      isSupported = false;
      isInitialized = false;
      gpuDevice = null;
      return null;
    }
  })();

  return initPromise;
}

/**
 * 現在のGPUデバイスを取得
 * まだ初期化されていない場合は初期化を試みる
 * @returns {Promise<GPUDevice|null>} GPUデバイスまたはnull
 */
export async function getGPUDevice() {
  if (gpuDevice) return gpuDevice;
  return initWebGPU();
}

/**
 * キャンバスをWeb GPUレンダリングに対応させる
 * @param {HTMLCanvasElement} canvas 対象キャンバス
 * @param {Object} options 設定オプション
 * @returns {Promise<{context: GPUCanvasContext, device: GPUDevice}|null>} 
 *   GPUコンテキストとデバイス、または非対応の場合はnull
 */
export async function setupCanvas(canvas, options = {}) {
  const device = await getGPUDevice();
  if (!device) return null;

  // デフォルトオプション
  const defaultOptions = {
    alphaMode: 'premultiplied',
    format: 'bgra8unorm',
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    devicePixelRatio: window.devicePixelRatio || 1
  };

  const config = { ...defaultOptions, ...options };

  // キャンバスのサイズ設定
  const dpr = config.devicePixelRatio;
  const width = canvas.clientWidth * dpr;
  const height = canvas.clientHeight * dpr;

  canvas.width = width;
  canvas.height = height;

  // GPUコンテキストの取得と設定
  const context = canvas.getContext('webgpu');
  if (!context) {
    console.error('[WebGPU] canvasからWebGPUコンテキストを取得できませんでした');
    return null;
  }

  // コンテキスト設定
  context.configure({
    device,
    format: config.format,
    alphaMode: config.alphaMode,
    usage: config.usage
  });

  return { context, device };
}

/**
 * シェーダーコードを作成・コンパイルする
 * @param {GPUDevice} device GPUデバイス
 * @param {string} code WGSLシェーダーコード
 * @param {string} entryPoint エントリーポイント関数名
 * @param {GPUShaderStageFlags} stage シェーダーステージ（頂点/フラグメント）
 * @returns {GPUShaderModule} コンパイル済みシェーダーモジュール
 */
export function createShader(device, code, entryPoint = 'main', stage = GPUShaderStage.FRAGMENT) {
  const shaderModule = device.createShaderModule({
    code
  });

  return shaderModule;
}

/**
 * 頂点バッファを作成する
 * @param {GPUDevice} device GPUデバイス
 * @param {Float32Array|Uint32Array} data バッファデータ
 * @param {GPUBufferUsageFlags} usage バッファ使用法
 * @returns {GPUBuffer} 作成されたバッファ
 */
export function createBuffer(device, data, usage) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });

  const arrayType = data.constructor;
  const arrayBuffer = buffer.getMappedRange();
  new arrayType(arrayBuffer).set(data);
  buffer.unmap();

  return buffer;
}

/**
 * レンダーパイプラインを作成する
 * @param {GPUDevice} device GPUデバイス
 * @param {Object} options パイプライン設定
 * @returns {GPURenderPipeline} 作成されたレンダーパイプライン
 */
export function createRenderPipeline(device, options) {
  const pipeline = device.createRenderPipeline({
    layout: options.layout || 'auto',
    vertex: {
      module: options.vertexShader,
      entryPoint: options.vertexEntryPoint || 'main',
      buffers: options.vertexBuffers || []
    },
    fragment: {
      module: options.fragmentShader,
      entryPoint: options.fragmentEntryPoint || 'main',
      targets: options.targets || [
        {
          format: options.format || 'bgra8unorm',
          blend: options.blend || undefined
        }
      ]
    },
    primitive: options.primitive || {
      topology: 'triangle-list',
      cullMode: 'none'
    },
    depthStencil: options.depthStencil || undefined
  });

  return pipeline;
}

/**
 * シンプルな2D描画のためのレンダラー作成
 * @param {HTMLCanvasElement} canvas 描画対象キャンバス
 * @returns {Promise<Object|null>} レンダラーオブジェクトまたはnull
 */
export async function createSimple2DRenderer(canvas) {
  // キャンバスのセットアップ
  const setup = await setupCanvas(canvas);
  if (!setup) return null;

  const { device, context } = setup;

  // 頂点シェーダー
  const vertexShaderCode = `
    struct VertexOutput {
      @builtin(position) position: vec4f,
      @location(0) color: vec4f,
      @location(1) uv: vec2f,
    }
    
    @vertex
    fn main(
      @location(0) position: vec2f,
      @location(1) color: vec4f,
      @location(2) uv: vec2f,
    ) -> VertexOutput {
      var output: VertexOutput;
      output.position = vec4f(position, 0.0, 1.0);
      output.color = color;
      output.uv = uv;
      return output;
    }
  `;

  // フラグメントシェーダー
  const fragmentShaderCode = `
    @fragment
    fn main(
      @location(0) color: vec4f,
      @location(1) uv: vec2f,
    ) -> @location(0) vec4f {
      return color;
    }
  `;

  // シェーダーモジュールの作成
  const vertexShader = createShader(device, vertexShaderCode, 'main', GPUShaderStage.VERTEX);
  const fragmentShader = createShader(device, fragmentShaderCode, 'main', GPUShaderStage.FRAGMENT);

  // 頂点バッファレイアウト
  const vertexBuffers = [
    {
      arrayStride: 8 * 4, // vec2f + vec4f + vec2f = 8 floats
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x2' },   // position
        { shaderLocation: 1, offset: 2 * 4, format: 'float32x4' }, // color
        { shaderLocation: 2, offset: 6 * 4, format: 'float32x2' }  // uv
      ]
    }
  ];

  // レンダーパイプラインの作成
  const pipeline = createRenderPipeline(device, {
    vertexShader,
    fragmentShader,
    vertexBuffers,
    format: 'bgra8unorm',
    blend: {
      color: {
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add'
      },
      alpha: {
        srcFactor: 'src-alpha',
        dstFactor: 'one-minus-src-alpha',
        operation: 'add'
      }
    }
  });

  // 簡単な四角形を描画する関数
  const drawRect = (x, y, width, height, color = [1, 1, 1, 1]) => {
    const left = x / canvas.width * 2 - 1;
    const top = -(y / canvas.height * 2 - 1);
    const right = (x + width) / canvas.width * 2 - 1;
    const bottom = -((y + height) / canvas.height * 2 - 1);

    const vertices = new Float32Array([
      // position(x,y), color(r,g,b,a), uv(u,v)
      left, top, color[0], color[1], color[2], color[3], 0, 0,
      right, top, color[0], color[1], color[2], color[3], 1, 0,
      right, bottom, color[0], color[1], color[2], color[3], 1, 1,

      left, top, color[0], color[1], color[2], color[3], 0, 0,
      right, bottom, color[0], color[1], color[2], color[3], 1, 1,
      left, bottom, color[0], color[1], color[2], color[3], 0, 1,
    ]);

    const vertexBuffer = createBuffer(
      device,
      vertices,
      GPUBufferUsage.VERTEX
    );

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'load',
        storeOp: 'store'
      }]
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(6); // 四角形の2つの三角形 = 6頂点
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);

    return vertexBuffer;
  };

  // レンダラーオブジェクトを返す
  return {
    device,
    context,
    pipeline,
    clear: (r = 0, g = 0, b = 0, a = 1) => {
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r, g, b, a },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    },
    drawRect,
    resize: () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        context.configure({
          device,
          format: 'bgra8unorm',
          alphaMode: 'premultiplied'
        });
        return true;
      }
      return false;
    }
  };
}