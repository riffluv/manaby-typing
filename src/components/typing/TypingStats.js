/**
 * TypingStats.js
 * タイピング統計情報表示コンポーネント
 * リファクタリング済み（2025年5月7日）
 */

import React, { memo, useMemo } from 'react';
import styles from '../../styles/typing/TypingStats.module.css';

/**
 * タイピング統計情報表示コンポーネント
 * 
 * @param {Object} props
 * @param {Object} props.stats - 統計情報オブジェクト
 * @param {number} props.stats.correctCount - 正解キー数
 * @param {number} props.stats.missCount - ミスタイプ数
 * @param {number} props.stats.kpm - 1分あたりのキー入力数
 * @param {number} props.stats.accuracy - 正確性 (0-100%)
 * @param {string} props.stats.rank - ランク (S, A, B, C, D, F)
 * @param {string} props.stats.rankColor - ランクの色
 * @param {string} props.layoutType - レイアウトタイプ ('horizontal', 'vertical', 'compact')
 */
const TypingStats = memo(({ 
  stats = {
    correctCount: 0,
    missCount: 0,
    kpm: 0,
    accuracy: 100,
    rank: 'F',
    rankColor: '#999999'
  }, 
  layoutType = 'horizontal'
}) => {
  // レイアウトクラスの決定
  const layoutClass = useMemo(() => {
    switch(layoutType) {
      case 'vertical':
        return styles.verticalLayout;
      case 'compact':
        return styles.compactLayout;
      default:
        return styles.horizontalLayout;
    }
  }, [layoutType]);

  // 総入力数の計算
  const totalCount = useMemo(() => {
    return stats.correctCount + stats.missCount;
  }, [stats.correctCount, stats.missCount]);
  
  // 精度の計算と書式化
  const formattedAccuracy = useMemo(() => {
    const accuracy = totalCount > 0 
      ? (stats.correctCount / totalCount) * 100 
      : 100;
    return accuracy.toFixed(1);
  }, [stats.correctCount, totalCount]);

  // ランクに応じたスタイル
  const rankClass = useMemo(() => {
    switch(stats.rank) {
      case 'S': return styles.rankS;
      case 'A': return styles.rankA;
      case 'B': return styles.rankB;
      case 'C': return styles.rankC;
      case 'D': return styles.rankD;
      default:  return styles.rankF;
    }
  }, [stats.rank]);
  
  // KPMに応じたクラス
  const kpmClass = useMemo(() => {
    if (stats.kpm >= 400) return styles.ultraFast;
    if (stats.kpm >= 300) return styles.veryFast;
    if (stats.kpm >= 200) return styles.fast;
    if (stats.kpm >= 100) return styles.normal;
    return stats.kpm > 0 ? styles.slow : '';
  }, [stats.kpm]);

  return (
    <div className={`${styles.statsContainer} ${layoutClass}`}>
      {/* ランク表示 */}
      <div className={styles.rankSection}>
        <div className={`${styles.rankBadge} ${rankClass}`}>
          {stats.rank}
        </div>
        <div className={styles.rankLabel}>ランク</div>
      </div>
      
      {/* 主要統計情報 */}
      <div className={styles.mainStats}>
        {/* KPM */}
        <div className={styles.statItem}>
          <div className={styles.statLabel}>キー/分</div>
          <div className={`${styles.statValue} ${kpmClass}`}>
            {stats.kpm}
          </div>
        </div>
        
        {/* 正確性 */}
        <div className={styles.statItem}>
          <div className={styles.statLabel}>正確性</div>
          <div className={styles.statValue}>
            {formattedAccuracy}%
          </div>
        </div>
      </div>
      
      {/* 詳細統計情報 */}
      <div className={styles.detailStats}>
        {/* 正解数 */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>正解</div>
          <div className={`${styles.detailValue} ${styles.correctCount}`}>
            {stats.correctCount}
          </div>
        </div>
        
        {/* ミス数 */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>ミス</div>
          <div className={`${styles.detailValue} ${styles.missCount}`}>
            {stats.missCount}
          </div>
        </div>
        
        {/* 総入力数 */}
        <div className={styles.detailItem}>
          <div className={styles.detailLabel}>合計</div>
          <div className={styles.detailValue}>
            {totalCount}
          </div>
        </div>
      </div>
    </div>
  );
});

// 表示名を設定（デバッグ用）
TypingStats.displayName = 'TypingStats';

export default TypingStats;