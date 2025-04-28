import React, { useRef, useState } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import styles from '../../styles/common/DoodleCanvas.module.css';
import DoodleUtils from '../../utils/DoodleUtils';

/**
 * お絵かきキャンバスコンポーネント
 * @param {Object} props
 * @param {Function} props.onSave - 保存時のコールバック
 * @param {Function} props.onCancel - キャンセル時のコールバック
 * @param {Object} props.options - キャンバスのオプション設定
 */
const DoodleCanvas = ({ onSave, onCancel, options = {} }) => {
  // デフォルトオプションとマージ
  const canvasOptions = { ...DoodleUtils.defaultDoodleOptions, ...options };
  
  // キャンバスへの参照
  const canvasRef = useRef(null);
  
  // 状態管理
  const [strokeColor, setStrokeColor] = useState(canvasOptions.strokeColor);
  const [strokeWidth, setStrokeWidth] = useState(canvasOptions.strokeWidth);
  
  // 描画を消去
  const handleClear = () => {
    canvasRef.current.clearCanvas();
  };
  
  // 直前の操作を元に戻す
  const handleUndo = () => {
    canvasRef.current.undo();
  };
  
  // 元に戻した操作をやり直す
  const handleRedo = () => {
    canvasRef.current.redo();
  };
  
  // 色を変更
  const handleColorChange = (color) => {
    setStrokeColor(color);
    canvasRef.current.eraseMode(false);
  };
  
  // ブラシサイズを変更
  const handleSizeChange = (size) => {
    setStrokeWidth(parseInt(size));
  };
  
  // 消しゴムモード切替
  const handleEraserToggle = () => {
    canvasRef.current.eraseMode(true);
  };
  
  // 描画モードに戻す
  const handleDrawModeToggle = () => {
    canvasRef.current.eraseMode(false);
  };
  
  // 描画を保存
  const handleSave = async () => {
    try {
      // PNG形式で画像をエクスポート
      const imageData = await canvasRef.current.exportImage('png');
      // 描画パスも取得
      const drawingPaths = await canvasRef.current.exportPaths();
      
      if (onSave && typeof onSave === 'function') {
        onSave({
          image: imageData,
          paths: drawingPaths
        });
      }
    } catch (error) {
      console.error('Error saving doodle:', error);
    }
  };
  
  return (
    <div className={styles.doodleCanvasContainer}>
      <div className={styles.toolbarTop}>
        <div className={styles.colorPalette}>
          {DoodleUtils.colorPalette.map((color, index) => (
            <button
              key={index}
              className={`${styles.colorButton} ${strokeColor === color ? styles.activeColor : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              aria-label={`色を選択: ${color}`}
            />
          ))}
        </div>
        
        <div className={styles.brushSizes}>
          {DoodleUtils.brushSizes.map((size) => (
            <button
              key={size}
              className={`${styles.sizeButton} ${strokeWidth === size ? styles.activeSize : ''}`}
              onClick={() => handleSizeChange(size)}
              aria-label={`ブラシサイズ: ${size}`}
            >
              <div 
                className={styles.sizeIndicator}
                style={{ width: `${size}px`, height: `${size}px` }}
              />
            </button>
          ))}
        </div>
      </div>
      
      <ReactSketchCanvas
        ref={canvasRef}
        width={canvasOptions.width}
        height={canvasOptions.height}
        strokeWidth={strokeWidth}
        strokeColor={strokeColor}
        backgroundColor={canvasOptions.backgroundColor}
        className={styles.canvas}
      />
      
      <div className={styles.toolbarBottom}>
        <button className={styles.toolButton} onClick={handleUndo} aria-label="元に戻す">
          ↩️
        </button>
        <button className={styles.toolButton} onClick={handleRedo} aria-label="やり直す">
          ↪️
        </button>
        <button className={styles.toolButton} onClick={handleDrawModeToggle} aria-label="描画モード">
          ✏️
        </button>
        <button className={styles.toolButton} onClick={handleEraserToggle} aria-label="消しゴム">
          🧽
        </button>
        <button className={styles.toolButton} onClick={handleClear} aria-label="全て消去">
          🗑️
        </button>
        <button className={styles.actionButton} onClick={handleSave}>
          保存
        </button>
        {onCancel && (
          <button className={styles.actionButton} onClick={onCancel}>
            キャンセル
          </button>
        )}
      </div>
    </div>
  );
};

export default DoodleCanvas;