/**
 * GitHub Pagesでデプロイ時にpublicフォルダ内のアセットを正しく参照するためのユーティリティ
 */

/**
 * publicディレクトリ内のアセットへの正しいパスを返す
 * @param {string} path - 相対パス（例: 'images/logo.png'）
 * @returns {string} - 環境に応じた正しいパス
 */
export const getStaticPath = (path) => {
  // 先頭のスラッシュを確保
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // パスの各部分を分割
  const pathParts = normalizedPath.split('/');
  // ファイル名部分をURLエンコードする（スペースなどの特殊文字を処理）
  const lastPart = pathParts[pathParts.length - 1];
  pathParts[pathParts.length - 1] = encodeURIComponent(lastPart);
  
  // 分割した部分を再結合
  const encodedPath = pathParts.join('/');

  // basePath設定に合わせて、本番環境ではリポジトリ名を含める
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${encodedPath}`;
};

export default getStaticPath;
