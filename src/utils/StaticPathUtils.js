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

  // basePath設定に合わせて、本番環境ではリポジトリ名を含める
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${normalizedPath}`;
};

export default getStaticPath;
