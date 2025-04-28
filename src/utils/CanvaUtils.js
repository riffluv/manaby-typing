/**
 * Canva APIと連携するためのユーティリティ
 */

// Canva APIの設定
const CANVA_API_ENDPOINT = 'https://api.canva.com/v1';

/**
 * Canva APIの認証情報
 * 注: 実際の値はNext.jsの環境変数から取得するのが安全です
 */
export const canvaApiConfig = {
  apiKey: process.env.NEXT_PUBLIC_CANVA_API_KEY || '',
  clientId: process.env.NEXT_PUBLIC_CANVA_CLIENT_ID || '',
  clientSecret: process.env.NEXT_PUBLIC_CANVA_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_CANVA_REDIRECT_URI || '',
};

/**
 * Canvaのデザインタイプ
 */
export const designTypes = {
  PRESENTATION: 'presentation',
  POSTER: 'poster',
  CARD: 'card',
  FLYER: 'flyer',
  SOCIAL_MEDIA: 'social_media',
  CUSTOM: 'custom',
};

/**
 * Canvaのデザインテンプレート
 */
export const designTemplates = [
  { id: 'template1', name: 'シンプルデザイン', type: designTypes.PRESENTATION },
  {
    id: 'template2',
    name: 'ビジネステンプレート',
    type: designTypes.PRESENTATION,
  },
  { id: 'template3', name: 'カラフルポスター', type: designTypes.POSTER },
  {
    id: 'template4',
    name: 'ソーシャルメディア投稿',
    type: designTypes.SOCIAL_MEDIA,
  },
];

/**
 * Canva APIの認証URLを生成する
 * @returns {string} Canva認証用のURL
 */
export const getCanvaAuthUrl = () => {
  const { clientId, redirectUri } = canvaApiConfig;
  const scope = 'design:read design:write';

  return `https://www.canva.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scope)}`;
};

/**
 * Canva認証コードからアクセストークンを取得する
 * @param {string} code - 認証コード
 * @returns {Promise<Object>} - アクセストークン情報
 */
export const getAccessToken = async (code) => {
  try {
    const { clientId, clientSecret, redirectUri } = canvaApiConfig;

    const response = await fetch('https://api.canva.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

/**
 * 画像をCanvaにアップロードする
 * @param {string} accessToken - Canvaアクセストークン
 * @param {string} imageBase64 - Base64エンコードされた画像データ
 * @returns {Promise<Object>} - アップロード結果
 */
export const uploadImageToCanva = async (accessToken, imageBase64) => {
  try {
    // Base64からBlobに変換
    const fetchResponse = await fetch(imageBase64);
    const blob = await fetchResponse.blob();

    const formData = new FormData();
    formData.append('image', blob);

    const response = await fetch(`${CANVA_API_ENDPOINT}/images/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading image to Canva:', error);
    throw error;
  }
};

/**
 * doodle描画をCanvaに送信するための橋渡し関数
 * @param {Object} sketchCanvasRef - react-sketch-canvasのref
 * @returns {Promise<Object>} - Canvaへのアップロード結果
 */
export const sendDoodleToCanva = async (sketchCanvasRef) => {
  try {
    // ローカルストレージからアクセストークンを取得（実際のアプリでは適切な保存方法を使用）
    const accessToken = localStorage.getItem('canva_access_token');
    if (!accessToken) {
      throw new Error('Canva access token not found');
    }

    // SketchCanvasから画像をエクスポート
    const imageBase64 = await sketchCanvasRef.current.exportImage('png');

    // Canvaにアップロード
    return await uploadImageToCanva(accessToken, imageBase64);
  } catch (error) {
    console.error('Error sending doodle to Canva:', error);
    throw error;
  }
};

export default {
  canvaApiConfig,
  designTypes,
  designTemplates,
  getCanvaAuthUrl,
  getAccessToken,
  uploadImageToCanva,
  sendDoodleToCanva,
};
