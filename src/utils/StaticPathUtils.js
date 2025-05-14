/**
 * GitHub PagesおよびVercelでデプロイ時にpublicフォルダ内のアセットを正しく参照するためのユーティリティ
 */

/**
 * 現在の環境がVercelかどうかを検出
 * @returns {boolean} Vercel環境かどうか
 */
export const isVercelEnv = () => {
  // process.envがクライアントサイドでも利用可能なpublic環境変数を確認
  const isVercel =
    typeof process !== 'undefined' &&
    process.env &&
    (process.env.VERCEL === '1' ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'production');

  // URLからの検出（デプロイメント後に利用可能）
  const isVercelUrl =
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.hostname.includes('vercel.app') ||
      window.location.hostname === 'manaby-typing.vercel.app');

  return isVercel || isVercelUrl;
};

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
  const isGitHubPages =
    typeof window !== 'undefined' &&
    ((window.location && window.location.hostname.includes('github.io')) ||
      window.location.href.includes('github.io'));

  // basePath設定に合わせて、本番環境ではリポジトリ名を含める
  // 明示的に設定されたbasePath、または自動検出された値を使用
  let basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // GitHub Pages環境または本番環境でbasePathが設定されていない場合、デフォルト値を使用  // Vercel環境の場合はbasePathを空にする
  if (isVercelEnv()) {
    basePath = ''; // Vercel環境では空のベースパス
  } else if ((isProduction || isGitHubPages) && !basePath) {
    basePath = '/manaby-typing'; // デフォルトのリポジトリ名
  } // 最終パスを生成（デバッグログを追加）
  let finalPath = `${basePath}${encodedPath}`;

  // Vercel環境またはブラウザ実行時のみの処理
  if (typeof window !== 'undefined') {
    // サウンドファイルの場合、大文字小文字の自動検出を試みる
    if (path.includes('.mp3')) {
      // ファイルパスが存在するかどうかのテスト（ローカルでは常に失敗するが、Vercelではキャッシュが効く可能性）
      const testImage = new Image();
      testImage.onerror = () => {
        // ファイルが見つからなかった場合、大文字小文字を変更して再試行
        if (path.includes('Hit') || path.includes('hit')) {
          // 'Hit' を 'hit' に、または 'hit' を 'Hit' に変更
          const newPath = path.includes('Hit')
            ? path.replace('Hit', 'hit')
            : path.replace('hit', 'Hit');

          // 新しいパスに変更
          finalPath = `${basePath}${
            newPath.startsWith('/') ? newPath : `/${newPath}`
          }`;
        }
      };
      // テスト開始
      testImage.src = finalPath;
    }
  }
  // デバッグログを削除

  return finalPath;
};

export default getStaticPath;
