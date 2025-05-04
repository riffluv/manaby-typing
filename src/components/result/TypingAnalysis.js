/**
 * TypingAnalysis.js
 * MCPサーバーからのデータを基に、ユーザーのタイピング分析結果と
 * 今後のトレーニング推奨を表示するコンポーネント
 */

import React, { useState, useEffect } from 'react';
import MCPUtils from '../../utils/MCPUtils';
import { motion } from 'framer-motion';
import styles from '../../styles/ResultScreen.module.css';

/**
 * タイピング分析コンポーネント
 * リザルト画面で表示する分析結果と次回のトレーニング推奨
 */
const TypingAnalysis = ({ stats }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // MCPサーバーから分析データを取得
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const result = await MCPUtils.getTypingAnalysis();
        
        // データ整形
        let analysisResult;
        if (result.success && result.analysis) {
          analysisResult = {
            strengths: result.analysis.strengths || ['スピードとリズム感'],
            weaknesses: result.analysis.weaknesses || ['正確性の向上が必要'],
            progress: result.analysis.progress || '継続的に上達しています',
            recommendations: result.recommendations || {
              recommendedFocus: '正確さとスピードのバランス',
              problemKeys: []
            },
            source: 'mcp'
          };
        } else if (result.fallbackRecommendations) {
          // フォールバック分析の利用
          analysisResult = generateFallbackAnalysis(stats, result.fallbackRecommendations);
        } else {
          // デフォルト分析を作成
          analysisResult = generateDefaultAnalysis(stats);
        }
        
        setAnalysisData(analysisResult);
      } catch (err) {
        console.error('分析データ取得エラー:', err);
        // エラー時はデフォルトの分析を表示
        setAnalysisData(generateDefaultAnalysis(stats));
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [stats]);
  
  // 統計情報からフォールバック分析を生成
  const generateFallbackAnalysis = (stats, fallbackRecommendations) => {
    const analysis = {
      strengths: [],
      weaknesses: [],
      progress: '継続的な練習を続けましょう',
      recommendations: fallbackRecommendations,
      source: 'fallback'
    };
    
    // KPM値に基づく強みと弱みの判定
    if (stats.kpm > 200) {
      analysis.strengths.push('タイピングスピードが優れています');
    } else if (stats.kpm < 100) {
      analysis.weaknesses.push('スピードの向上が必要です');
    } else {
      analysis.strengths.push('安定したタイピングスピードです');
    }
    
    // 精度に基づく強みと弱みの判定
    if (stats.accuracy > 95) {
      analysis.strengths.push('高い入力精度を持っています');
    } else if (stats.accuracy < 85) {
      analysis.weaknesses.push('正確性の向上が必要です');
    }
    
    return analysis;
  };
  
  // デフォルトの分析を生成
  const generateDefaultAnalysis = (stats) => {
    const analysis = {
      strengths: [],
      weaknesses: [],
      progress: '定期的な練習を続けましょう',
      recommendations: {
        recommendedFocus: '基本練習',
        problemKeys: []
      },
      source: 'default'
    };
    
    // 単純なスコアベースの分析
    if (stats.kpm > 200) {
      analysis.strengths.push('高速タイピング能力');
      analysis.recommendations.recommendedFocus = '正確性の向上';
    } else if (stats.kpm > 100) {
      analysis.strengths.push('平均以上のタイピング速度');
      analysis.recommendations.recommendedFocus = 'スピードと正確性のバランス';
    } else {
      analysis.weaknesses.push('タイピング速度の向上');
      analysis.recommendations.recommendedFocus = 'スピード強化トレーニング';
    }
    
    if (stats.accuracy > 95) {
      analysis.strengths.push('高い正確性');
    } else if (stats.accuracy < 85) {
      analysis.weaknesses.push('タイピング精度の向上');
    }
    
    return analysis;
  };
  
  // トグルボタンのクリック処理
  const handleToggleExpand = () => {
    setExpanded(!expanded);
    
    // トグル操作をMCPに記録
    MCPUtils.recordUXElement('analysis_toggle', {
      action: expanded ? 'collapse' : 'expand',
      screen: 'result'
    });
  };
  
  // ローディング表示
  if (loading) {
    return (
      <div className={styles.analysisContainer}>
        <div className={styles.analysisHeader}>
          <h3>タイピング分析</h3>
        </div>
        <div className={styles.loadingText}>データ分析中...</div>
      </div>
    );
  }
  
  // データがない場合
  if (!analysisData) {
    return null;
  }
  
  return (
    <motion.div 
      className={styles.analysisContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className={styles.analysisHeader} onClick={handleToggleExpand}>
        <h3>タイピング分析</h3>
        <button className={styles.toggleButton}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      
      {expanded && (
        <motion.div 
          className={styles.analysisContent}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.analysisSection}>
            <h4>強み</h4>
            <ul className={styles.analysisList}>
              {analysisData.strengths.map((strength, index) => (
                <li key={`strength-${index}`}>{strength}</li>
              ))}
            </ul>
          </div>
          
          <div className={styles.analysisSection}>
            <h4>改善点</h4>
            <ul className={styles.analysisList}>
              {analysisData.weaknesses.length > 0 ? 
                analysisData.weaknesses.map((weakness, index) => (
                  <li key={`weakness-${index}`}>{weakness}</li>
                )) : 
                <li>特に目立った弱点はありません</li>
              }
            </ul>
          </div>
          
          <div className={styles.analysisSection}>
            <h4>次回のトレーニング推奨</h4>
            <p className={styles.recommendation}>
              <strong>フォーカス:</strong> {analysisData.recommendations.recommendedFocus}
            </p>
            
            {analysisData.recommendations.problemKeys && 
             analysisData.recommendations.problemKeys.length > 0 && (
              <div className={styles.problemKeys}>
                <p><strong>重点的に練習するキー:</strong></p>
                <div className={styles.keyList}>
                  {analysisData.recommendations.problemKeys.map((key, index) => (
                    <span key={`key-${index}`} className={styles.keyBadge}>{key}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.progressNote}>
            <p>{analysisData.progress}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TypingAnalysis;