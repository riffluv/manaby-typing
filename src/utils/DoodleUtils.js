/**
 * お絵かき機能に関するユーティリティ
 */

/**
 * キャンバスの設定オプション
 */
export const defaultDoodleOptions = {
  width: '100%',
  height: '300px',
  backgroundColor: '#FFFFFF',
  strokeWidth: 4,
  strokeColor: '#000000',
};

/**
 * 利用可能なブラシサイズ
 */
export const brushSizes = [2, 4, 6, 8, 10];

/**
 * カラーパレット
 */
export const colorPalette = [
  '#000000', // 黒
  '#FF0000', // 赤
  '#00FF00', // 緑
  '#0000FF', // 青
  '#FFFF00', // 黄
  '#FF00FF', // マゼンタ
  '#00FFFF', // シアン
  '#FFFFFF', // 白
];

/**
 * 描画データをJSON形式で保存
 * @param {Object} drawingData - 描画データ
 * @returns {string} - JSON文字列
 */
export const saveDrawingToJSON = (drawingData) => {
  try {
    return JSON.stringify(drawingData);
  } catch (error) {
    console.error('Failed to save drawing data:', error);
    return null;
  }
};

/**
 * JSON文字列から描画データを読み込む
 * @param {string} jsonString - 描画データのJSON文字列
 * @returns {Object|null} 描画データオブジェクト、またはnull（エラー時）
 */
export const loadDrawingFromJSON = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to load drawing data:', error);
    return null;
  }
};

/**
 * 描画データを画像に変換
 * @param {Object} sketchCanvasRef - react-sketch-canvasのref
 * @returns {Promise<string>} - Data URL形式の画像
 */
export const exportDrawingAsImage = async (sketchCanvasRef) => {
  try {
    if (sketchCanvasRef?.current) {
      // PNG形式でエクスポート
      return await sketchCanvasRef.current.exportImage('png');
    }
    return null;
  } catch (error) {
    console.error('Failed to export drawing as image:', error);
    return null;
  }
};

export default {
  defaultDoodleOptions,
  brushSizes,
  colorPalette,
  saveDrawingToJSON,
  loadDrawingFromJSON,
  exportDrawingAsImage,
};