'use client';

import React, { useMemo } from 'react';
import styles from '../../styles/typing/GameStatusBar.module.css';
import { getStaticPath } from '../../utils/StaticPathUtils'; // 静的アセットパス用のユーティリティ

/**
 * ゲームステータスバーコンポーネント
 * タイピングゲームの進行状況と統計を表示します
 * パフォーマンス最適化版 - framer-motionを除去してCSSアニメーションに変更
 */
const GameStatusBar = React.memo(({
  solvedCount = 0,
  requiredCount = 5,
  typingStats = {},
  className = '',
  scoreInfo = {}, // スコア情報（score, combo, maxCombo, rank）
}) => {
  // スコア情報の分解（安全なアクセス）- useMemoを使用して再計算を最小化
  const { score = 0, combo = 0, maxCombo = 0, rank = 'F' } = useMemo(() => 
    scoreInfo || {}, [scoreInfo]
  );

  // コンボ表示の有無（コンボが2以上ある場合のみ表示）
  const showCombo = combo >= 2;

  // コンボの大きさに応じたアニメーションスケール（必要な時のみ計算）
  const comboScale = useMemo(() => {
    if (!showCombo) return 1; // コンボ表示がない場合は計算しない
    // コンボ数に応じてスケールを変更（最大1.5倍）
    const baseScale = 1;
    const comboBonus = Math.min(combo / 20, 0.5); // 最大0.5のボーナス
    return baseScale + comboBonus;
  }, [combo, showCombo]);

  // ランクに基づく色クラスの設定
  const rankColorClass = useMemo(() => {
    switch (rank?.toUpperCase?.() || 'F') {
      case 'SSS': return styles.rank_sss;
      case 'SS': return styles.rank_ss;
      case 'S+':
      case 'S': return styles.rank_s;
      case 'A+':
      case 'A': return styles.rank_a;
      case 'B+':
      case 'B': return styles.rank_b;
      case 'C+':
      case 'C': return styles.rank_c;
      case 'D+':
      case 'D': return styles.rank_d;
      default: return '';
    }
  }, [rank]);

  // ロゴだけを含むシンプルなヘッダーを返す - framer-motionを除去
  return (
    <header
      className={`${styles.status_bar} ${className} ${styles.empty_bar} ${styles.fade_in}`}
    >
      {/* manabyロゴを左上に配置 - CSSアニメーションを使用 */}
      <div className={styles.logo_container}>
        <img
          src={getStaticPath('/images/manaby01_.png')}
          alt="manaby ロゴ"
          className={`${styles.manaby_logo} ${styles.logo_animation}`}
          title="manaby - 就労支援"
          loading="eager"
          width={35} 
          height={35}
        />
      </div>
    </header>
  );
});

// コンポーネント名を設定（開発ツールでの識別用）
GameStatusBar.displayName = 'GameStatusBar';

export default GameStatusBar;
