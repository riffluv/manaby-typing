// クレジット情報を一元管理するファイル
// プロジェクト全体で共通のクレジット情報を管理します

export const creditsData = {
  // 開発セクション
  development: {
    title: '企画・開発',
    credits: ['カフェイン中毒', 'Google大先生'],
  },

  // ライセンスセクション
  license: {
    title: 'ライセンス',
    text: '© 2024 Manaby Typing Game. All Rights Reserved.',
  },
};

// 簡易表示用のクレジットセクション（モーダル表示用）
export const getSimpleCredits = () => {
  return [
    creditsData.development,
    creditsData.license,
  ];
};

// 完全なクレジットセクション（専用画面表示用）
export const getFullCredits = () => {
  return [
    creditsData.development,
    creditsData.license,
  ];
};

export default { creditsData, getSimpleCredits, getFullCredits };
