/**
 * GitHub Pagesでデプロイ時にpublicフォルダ内のアセットを正しく参照するためのユーティリティ
 */

/**
 * publicディレクトリ内のアセットへの正しいパスを返す
 * @param {string} path - 相対パス（例: 'images/logo.png'）
 * @returns {string} - 環境に応じた正しいパス
 */
export const getStaticPath = (path) => {
  // 無効な入力チェック
  if (!path) return '';
  
  // 先頭のスラッシュを確保
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // パスの各部分を分割
  const pathParts = normalizedPath.split('/');
  // ファイル名部分をURLエンコードする（スペースなどの特殊文字を処理）
  const lastPart = pathParts[pathParts.length - 1];
  pathParts[pathParts.length - 1] = encodeURIComponent(lastPart);
  
  // 分割した部分を再結合
  const encodedPath = pathParts.join('/');

  // GitHub Pages環境確認 - より堅牢な検出
  const isProduction = process.env.NODE_ENV === 'production';
  const isGitHubPages = typeof window !== 'undefined' && 
    window.location && window.location.hostname.includes('github.io');
    
  // basePath設定に合わせて、本番環境ではリポジトリ名を含める
  // 明示的に設定されたbasePath、または自動検出された値を使用
  let basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // GitHub Pages環境なのにbasePathが設定されていない場合、デフォルト値を使用
  if (isProduction && isGitHubPages && !basePath) {
    basePath = '/manaby-typing'; // デフォルトのリポジトリ名
    console.warn('NEXT_PUBLIC_BASE_PATH未設定、デフォルト値を使用:', basePath);
  }
  
  // 最終パスを生成（デバッグログを追加）
  const finalPath = `${basePath}${encodedPath}`;
  if (typeof window !== 'undefined' && 
      window.__DEBUG_STATIC_PATH && 
      path.includes('hit')) {
    console.log(`StaticPath - 入力: ${path}, 出力: ${finalPath}, 環境: ${process.env.NODE_ENV}`);
  }
  
  return finalPath;
};

export default getStaticPath;
