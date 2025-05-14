/**
 * サウンド再生を専用オーディオスレッドで処理するAudioWorkletProcessor
 * Weather Typingレベルの超低遅延サウンド再生を実現
 */
class UltraLowLatencySoundProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 内部状態の初期化
    this._buffers = new Map();
    this._activeNodes = [];
    this._nextNodeId = 1;

    // メインスレッドからのメッセージを処理
    this.port.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'load':
          // 音声バッファをロード
          this._buffers.set(data.id, data.buffer);
          this.port.postMessage({ type: 'loaded', id: data.id });
          break;

        case 'play':
          // 音声を再生
          this._schedulePlayback(data.id, data.options);
          break;

        case 'stop':
          // 特定のサウンドを停止
          this._stopSound(data.id);
          break;

        case 'clear':
          // すべてのサウンドをクリア
          this._activeNodes = [];
          break;
      }
    };
  }

  /**
   * 再生をスケジュール
   * @param {string} id サウンドID
   * @param {object} options 再生オプション
   */
  _schedulePlayback(id, options = {}) {
    if (!this._buffers.has(id)) {
      console.error(`[AudioWorklet] サウンド ${id} が見つかりません`);
      return;
    }

    const buffer = this._buffers.get(id);
    const nodeId = this._nextNodeId++;
    const startTime = currentTime;

    // 再生ノードを登録
    this._activeNodes.push({
      id: nodeId,
      soundId: id,
      buffer,
      startTime,
      position: 0,
      volume: options.volume || 1.0,
      loop: !!options.loop
    });

    // 再生開始をメインスレッドに通知
    this.port.postMessage({
      type: 'playing',
      nodeId,
      soundId: id,
      startTime
    });
  }

  /**
   * 特定のサウンドを停止
   * @param {number} id ノードID
   */
  _stopSound(id) {
    const index = this._activeNodes.findIndex(node => node.id === id);
    if (index !== -1) {
      this._activeNodes.splice(index, 1);
      this.port.postMessage({ type: 'stopped', id });
    }
  }

  /**
   * オーディオサンプルを処理（128サンプルごとに呼び出される）
   * @param {Float32Array[][]} inputs 入力バッファ
   * @param {Float32Array[][]} outputs 出力バッファ
   * @param {Object} parameters パラメータ
   * @returns {boolean} 処理を継続するかどうか
   */
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    // アクティブな出力チャンネルがなければ早期リターン
    if (!output || output.length === 0) return true;

    // 出力チャンネル（ステレオなら2チャンネル）
    const channels = output.length;

    // 各チャンネルをクリア
    for (let c = 0; c < channels; c++) {
      const channelData = output[c];
      // サンプルバッファをゼロで初期化
      channelData.fill(0);
    }

    // アクティブなノードを処理
    const currentNodes = [...this._activeNodes];

    for (let i = currentNodes.length - 1; i >= 0; i--) {
      const node = currentNodes[i];
      const buffer = node.buffer;

      // バッファからデータを出力にミキシング
      const channelCount = Math.min(buffer.length, channels);
      const samplesLeft = buffer.length > 0 ? buffer[0].length - node.position : 0;

      if (samplesLeft <= 0) {
        // バッファの終端に達した場合
        if (node.loop) {
          // ループの場合は位置をリセット
          node.position = 0;
        } else {
          // 非ループの場合は削除
          this._activeNodes.splice(this._activeNodes.indexOf(node), 1);
          this.port.postMessage({ type: 'ended', id: node.id });
          continue;
        }
      }

      // 実際に処理するサンプル数
      const samplesToProcess = Math.min(samplesLeft, 128);

      // 各チャンネルのオーディオデータを処理
      for (let c = 0; c < channelCount; c++) {
        const inputChannel = buffer[c];
        const outputChannel = output[c];

        // ミキシング（加算）
        for (let j = 0; j < samplesToProcess; j++) {
          outputChannel[j] += inputChannel[node.position + j] * node.volume;
        }
      }

      // 位置を更新
      node.position += 128;
    }

    // 処理を継続
    return true;
  }
}

// AudioWorkletProcessorを登録
registerProcessor('ultra-low-latency-sound-processor', UltraLowLatencySoundProcessor);