/**
 * TypingCoach.js
 * MCPサーバーと連携し、ユーザーのタイピングパターンを分析して
 * リアルタイムでアドバイスを提供するコンポーネント
 */

import React, { useState, useEffect, useCallback } from 'react';
import MCPUtils from '../../utils/MCPUtils';
import { useMCPContext } from '../../utils/MCPUtils';

// スタイル定義
const coachStyles = {
  container: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    width: '280px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    padding: '12px',
    color: 'white',
    fontFamily: 'var(--font-noto-sans-jp)',
    fontSize: '13px',
    zIndex: 100,
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    paddingBottom: '6px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    marginRight: '8px',
    fontSize: '16px',
    color: '#4CAF50',
  },
  minimizeButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    padding: '3px 6px',
    fontSize: '12px',
    borderRadius: '4px',
  },
  content: {
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  stats: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    padding: '4px 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#61dafb',
  },
  minimized: {
    width: 'auto',
    padding: '8px 12px',
  },
  pill: {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '12px',
    backgroundColor: 'rgba(97, 218, 251, 0.2)',
    marginRight: '4px',
    fontSize: '11px',
  },
  tipsList: {
    paddingLeft: '16px',
    margin: '6px 0',
  },
  tip: {
    marginBottom: '4px',
  },
  highlight: {
    color: '#61dafb',
    fontWeight: 'bold',
  }
};

// コーチからのアドバイスメッセージ集
const coachMessages = {
  speed: [
    'リズムを保ちながらタイピングすると速度が上がります',
    'キーボードを見ずに入力することを練習しましょう',
    'タイピングの姿勢を正しく保つことが大切です',
    '次の文字を予測しながら入力するとスピードアップします',
  ],
  accuracy: [
    '正確さを意識して、一文字一文字確認しながらタイプしましょう',
    '難しい単語は区切って練習すると良いでしょう',
    'ミスが多い場合は少し速度を落として正確さを優先しましょう',
    'リラックスして肩の力を抜くと正確性が向上します',
  ],
  improvement: [
    'コンスタントな練習が上達の鍵です',
    '10分でも毎日続けることが大切です',
    '様々な種類の文章を練習するとバランス良く上達します',
    '苦手なキーを集中的に練習すると効果的です',
  ],
  motivation: [
    '素晴らしい進歩です！その調子で頑張りましょう',
    'タイピングスキルは様々な場面で役立ちます',
    '小さな進歩の積み重ねが大きな成長につながります',
    '継続は力なり、毎日の練習が実を結びます',
  ]
};

/**
 * タイピングコーチコンポーネント
 * MCPサーバーからの分析データに基づいて、リアルタイムでタイピングアドバイスを提供
 */
const TypingCoach = ({ 
  typingStats = {}, 
  currentProblem = '',
  onCoachInteraction = () => {},
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [coachData, setCoachData] = useState({
    tips: [],
    focus: '正確さとスピードのバランス',
    problemKeys: [],
    lastAnalyzed: Date.now(),
  });
  const { isActive } = useMCPContext();

  // MCPサーバーからのタイピング分析データを取得
  const analyzeTyping = useCallback(async () => {
    // コーチデータの取得と更新は5秒ごとに制限
    if (Date.now() - coachData.lastAnalyzed < 5000) return;
    
    try {
      const analysisResult = await MCPUtils.getTypingAnalysis();
      
      if (analysisResult.success) {
        // 分析成功
        const { analysis, recommendations } = analysisResult;
        
        setCoachData({
          tips: generateTips(analysis, typingStats),
          focus: recommendations?.recommendedFocus || coachData.focus,
          problemKeys: recommendations?.problemKeys || [],
          lastAnalyzed: Date.now(),
        });
        
        // コーチとの対話をイベントとして記録
        onCoachInteraction('analysis_received');
      } else if (analysisResult.fallbackRecommendations) {
        // フォールバック推奨の利用
        setCoachData({
          tips: generateFallbackTips(typingStats, currentProblem),
          focus: analysisResult.fallbackRecommendations.recommendedFocus,
          problemKeys: analysisResult.fallbackRecommendations.problemKeys,
          lastAnalyzed: Date.now(),
        });
        
        // フォールバック利用を記録
        onCoachInteraction('fallback_used');
      }
    } catch (err) {
      console.error('タイピング分析エラー:', err);
    }
  }, [typingStats, currentProblem, coachData.lastAnalyzed, onCoachInteraction]);

  // 定期的な分析の実行
  useEffect(() => {
    if (!isActive) return;
    
    // 初回分析
    analyzeTyping();
    
    // 定期的な分析更新（10秒ごと）
    const intervalId = setInterval(analyzeTyping, 10000);
    
    return () => clearInterval(intervalId);
  }, [analyzeTyping, isActive]);
  
  // 進捗に応じたヒントの生成
  const generateTips = (analysis, stats) => {
    const tips = [];
    
    // KPMに基づいたアドバイス
    if (stats.kpm < 100) {
      tips.push(getRandomMessage('speed'));
    } else if (stats.kpm > 300) {
      tips.push('素晴らしいスピードです！正確さも意識しましょう');
    }
    
    // 精度に基づいたアドバイス
    if (stats.accuracy < 90) {
      tips.push(getRandomMessage('accuracy'));
    } else if (stats.accuracy > 98) {
      tips.push('とても正確です！少しずつスピードアップに挑戦しましょう');
    }
    
    // モチベーション維持のためのメッセージ
    tips.push(getRandomMessage('motivation'));
    
    return tips;
  };

  // フォールバック時のヒント生成
  const generateFallbackTips = (stats, currentText) => {
    const tips = [];
    
    // 基本的なアドバイス
    if (stats.kpm < 150) {
      tips.push(getRandomMessage('speed'));
    }
    
    if (stats.accuracy < 95) {
      tips.push(getRandomMessage('accuracy'));
    }
    
    // 常に改善のヒントを1つ
    tips.push(getRandomMessage('improvement'));
    
    return tips;
  };
  
  // メッセージカテゴリからランダムに取得
  const getRandomMessage = (category) => {
    const messages = coachMessages[category] || coachMessages.motivation;
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  // 最小化/展開の切り替え
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    onCoachInteraction(isMinimized ? 'expanded' : 'minimized');
  };
  
  // ミスの多いキーの表示
  const renderProblemKeys = () => {
    if (!coachData.problemKeys || coachData.problemKeys.length === 0) {
      return null;
    }
    
    return (
      <div style={{ marginTop: '6px', fontSize: '12px' }}>
        <span>苦手キー: </span>
        {coachData.problemKeys.map((key, index) => (
          <span key={index} style={coachStyles.pill}>{key}</span>
        ))}
      </div>
    );
  };

  // 最小化表示
  if (isMinimized) {
    return (
      <div style={{...coachStyles.container, ...coachStyles.minimized}}
           onClick={toggleMinimize}>
        <div style={coachStyles.title}>
          <span style={coachStyles.icon}>👨‍🏫</span>
          <span>コーチ</span>
        </div>
      </div>
    );
  }

  // 通常表示
  return (
    <div style={coachStyles.container}>
      <div style={coachStyles.header}>
        <div style={coachStyles.title}>
          <span style={coachStyles.icon}>👨‍🏫</span>
          <span>タイピングコーチ</span>
        </div>
        <button 
          style={coachStyles.minimizeButton} 
          onClick={toggleMinimize}
          aria-label="最小化"
        >
          ─
        </button>
      </div>
      
      <div style={coachStyles.content}>
        <div>
          <span>フォーカス: </span>
          <span style={coachStyles.highlight}>{coachData.focus}</span>
        </div>
        
        {renderProblemKeys()}
        
        <ul style={coachStyles.tipsList}>
          {coachData.tips.map((tip, index) => (
            <li key={index} style={coachStyles.tip}>{tip}</li>
          ))}
        </ul>
      </div>
      
      <div style={coachStyles.stats}>
        <div style={coachStyles.statItem}>
          <span>KPM</span>
          <span style={coachStyles.statValue}>{typingStats.kpm || 0}</span>
        </div>
        <div style={coachStyles.statItem}>
          <span>正確性</span>
          <span style={coachStyles.statValue}>
            {typingStats.accuracy ? Math.round(typingStats.accuracy) : 0}%
          </span>
        </div>
        <div style={coachStyles.statItem}>
          <span>問題数</span>
          <span style={coachStyles.statValue}>{typingStats.solvedCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default TypingCoach;