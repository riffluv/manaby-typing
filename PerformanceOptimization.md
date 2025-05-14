# パフォーマンス最適化のためのベストプラクティス

このドキュメントでは、プロジェクト全体のパフォーマンスを最適化するための主要なベストプラクティスを説明します。

## 1. レンダリング最適化

### React.memoの適切な使用
```javascript
// 良い例 - 頻繁に再レンダリングされる可能性のあるコンポーネント
const ExpensiveComponent = React.memo(({ data }) => {
  // コンポーネント実装
});

// 注意が必要な例 - 単純すぎるコンポーネントではオーバーヘッドになる可能性
const SimpleComponent = ({ text }) => <span>{text}</span>;
```

### useMemo/useCallbackの効果的な使用
```javascript
// 良い例 - 計算コストの高い処理をメモ化
const sortedData = useMemo(() => {
  return expensiveSort(data);
}, [data]);

// 良い例 - イベントハンドラをメモ化してprops変更時の再作成を防止
const handleClick = useCallback(() => {
  processClick(itemId);
}, [itemId]);
```

### 制限付きレンダリング
```javascript
// アニメーションフレーム同期してレンダリング回数を制限
function useThrottledState(initialState, fps = 30) {
  const [state, setState] = useState(initialState);
  const requestRef = useRef(null);
  const previousTimeRef = useRef(null);
  const throttledSetState = useCallback((newState) => {
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(timestamp => {
        if (!previousTimeRef.current || 
            timestamp - previousTimeRef.current >= (1000 / fps)) {
          previousTimeRef.current = timestamp;
          setState(newState);
        }
        requestRef.current = null;
      });
    }
  }, [fps]);
  
  return [state, throttledSetState];
}
```

## 2. アニメーション最適化

### CSS Transitions優先
framer-motionなどのライブラリはパワフルですが、シンプルなアニメーションではCSSの方が効率的です。

```css
/* framer-motionの代わりにCSSトランジションを使用 */
.element {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.element:hover {
  transform: scale(1.05);
  opacity: 0.9;
}
```

### GPU支援処理の活用
```css
/* GPUアクセラレーションを活用する */
.optimized-animation {
  transform: translateZ(0);  /* GPUレンダリングを強制 */
  will-change: transform, opacity;  /* 変化する可能性のあるプロパティを事前通知 */
}
```

### アニメーション同時実行制限
```javascript
// アニメーション制限コントローラー
const AnimationController = {
  runningAnimations: new Set(),
  maxConcurrent: 5,
  
  startAnimation(id, animationFn) {
    // 同時実行数が上限に達していたら低優先度アニメーションをキャンセル
    if (this.runningAnimations.size >= this.maxConcurrent) {
      // 優先度の低いアニメーションを1つキャンセル
      const lowestPriority = [...this.runningAnimations]
        .sort((a, b) => a.priority - b.priority)[0];
      if (lowestPriority) {
        this.stopAnimation(lowestPriority.id);
      }
    }
    
    // 新しいアニメーションを開始
    this.runningAnimations.add({ id, animationFn });
    return animationFn();
  },
  
  stopAnimation(id) {
    // 特定のアニメーションを停止
    const animation = [...this.runningAnimations]
      .find(anim => anim.id === id);
    if (animation) {
      this.runningAnimations.delete(animation);
    }
    return animation;
  }
};
```

## 3. メモリ管理とメモリリーク対策

### イベントリスナーのクリーンアップ
```javascript
useEffect(() => {
  window.addEventListener('resize', handleResize);
  
  // クリーンアップ関数でリスナーを削除
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, [handleResize]);
```

### キャッシュ管理
```javascript
// キャッシュサイズを制限するLRUキャッシュの実装例
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }
  
  get(key) {
    if (!this.cache.has(key)) return null;
    
    // アクセスしたアイテムを最新に更新
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }
  
  put(key, value) {
    // キャッシュがいっぱいの場合は最も古いアイテムを削除
    if (this.cache.size >= this.capacity) {
      // Map.keysは挿入順を保持するため、最初のアイテムが最も古い
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}
```

## 4. ネットワーク最適化

### 画像の最適化
- WebPフォーマットを使用（ブラウザサポートを確認）
- srcset属性で複数サイズ提供
- 遅延読み込み

```html
<img 
  src="small.webp"
  srcset="small.webp 400w, medium.webp 800w, large.webp 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  loading="lazy"
  alt="最適化された画像"
/>
```

### キャッシュ戦略
```javascript
// Service WorkerによるAPIレスポンスのキャッシュ
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open('api-cache').then((cache) => {
        return fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        }).catch(() => {
          return cache.match(event.request);
        });
      })
    );
  }
});
```

## 5. Web Workers活用

### データ処理のオフロード
```javascript
// 重い計算処理をWorkerに委譲
const worker = new Worker('heavy-calculation-worker.js');

worker.postMessage({
  type: 'calculate',
  data: largeDataSet
});

worker.onmessage = (e) => {
  const { result } = e.data;
  updateUIWithResult(result);
};
```

## 6. デバッグとプロファイリング

### パフォーマンス測定ユーティリティ
```javascript
// シンプルなパフォーマンス計測ユーティリティ
const PerformanceMonitor = {
  marks: {},
  
  start(label) {
    this.marks[label] = performance.now();
  },
  
  end(label) {
    if (!this.marks[label]) return 0;
    
    const duration = performance.now() - this.marks[label];
    delete this.marks[label];
    
    // 開発環境のみログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
};
```

### React Profilerの使用
```javascript
import { Profiler } from 'react';

// パフォーマンス問題を特定するためのプロファイラー
function onRenderCallback(
  id, // プロファイラーツリーのコンポーネントを識別する "id"
  phase, // マウント/更新のどちらが原因でレンダーがコミットされたのか
  actualDuration, // レンダリングに要した時間
  baseDuration, // メモ化せずにサブツリー全体をレンダリングするのにかかる推定時間
  startTime, // レンダリング開始時のタイムスタンプ
  commitTime, // コミット開始時のタイムスタンプ
  interactions // このレンダーに関連するインタラクションのセット
) {
  // 時間がかかりすぎている場合に警告
  if (actualDuration > 16) { // 60fps未満
    console.warn(`[Slow Render] ${id}: ${actualDuration.toFixed(2)}ms`);
  }
}

// 使用例
<Profiler id="GameScreen" onRender={onRenderCallback}>
  <GameScreen />
</Profiler>
```

## 実装例

各最適化技術を段階的に適用し、ユーザー体験を向上させましょう。
最適化前後のパフォーマンスを計測し、効果を確認することをお勧めします。

プロジェクト特有のボトルネックを特定するために、Chrome Dev Toolsのパフォーマンスプロファイラーを活用してください。
