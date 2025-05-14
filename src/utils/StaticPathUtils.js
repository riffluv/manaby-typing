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
  
  // デバッグ用
  if (typeof window !== 'undefined' && path.includes('.mp3')) {
    console.log(`処理前のパス: ${path}, 正規化後: ${normalizedPath}, エンコード後: ${encodedPath}`);
  }
  // GitHub Pages環境確認 - より堅牢な検出
  const isProduction = process.env.NODE_ENV === 'production';
  const isGitHubPages = typeof window !== 'undefined' && 
    (window.location && window.location.hostname.includes('github.io') || 
     window.location.href.includes('github.io'));
    
  // デバッグ情報
  if (typeof window !== 'undefined') {
    console.log('環境情報:', {
      isProduction,
      isGitHubPages,
      hostname: window.location ? window.location.hostname : '不明',
      href: window.location ? window.location.href : '不明',
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || '未設定'
    });
  }
    
  // basePath設定に合わせて、本番環境ではリポジトリ名を含める
  // 明示的に設定されたbasePath、または自動検出された値を使用
  let basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // GitHub Pages環境または本番環境でbasePathが設定されていない場合、デフォルト値を使用
  if ((isProduction || isGitHubPages) && !basePath) {
    basePath = '/manaby-typing'; // デフォルトのリポジトリ名
    console.warn('NEXT_PUBLIC_BASE_PATH未設定、デフォルト値を使用:', basePath);
  }
    // 最終パスを生成（デバッグログを追加）
  const finalPath = `${basePath}${encodedPath}`;
  
  // サウンドファイルのデバッグログを常に表示（問題調査のため）
  if (typeof window !== 'undefined' && (
      path.includes('.mp3') || path.includes('sound'))) {
    console.log(`StaticPath - 入力: ${path}, 出力: ${finalPath}, 環境: ${process.env.NODE_ENV}, GitHub Pages: ${isGitHubPages}`);
  }
  
  return finalPath;
};

export default getStaticPath;
