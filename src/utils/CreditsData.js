// クレジット情報を一元管理するファイル
// プロジェクト全体で共通のクレジット情報を管理します

export const creditsData = {
  // 開発セクション
  development: {
    title: '開発',
    credits: ['開発者名'],
  },

  // デザインセクション
  design: {
    title: 'デザイン',
    credits: ['デザイナー名'],
  },

  // 素材セクション
  resources: {
    title: '素材',
    listItems: [
      'アイコン素材：素材提供元',
      'フォント：フォント提供元',
      'フォント：効果音提供元',
    ],
  },

  // 謝辞セクション（詳細なクレジット画面でのみ表示）
  acknowledgements: {
    title: '謝辞',
    text: 'このゲームの開発にあたり、多くの方々のサポートをいただきました。感謝申し上げます。',
  },
};

// 簡易表示用のクレジットセクション（モーダル表示用）
export const getSimpleCredits = () => {
  return [creditsData.development, creditsData.design, creditsData.resources];
};

// 完全なクレジットセクション（専用画面表示用）
export const getFullCredits = () => {
  return [
    creditsData.development,
    creditsData.design,
    creditsData.resources,
    creditsData.acknowledgements,
  ];
};

export default { creditsData, getSimpleCredits, getFullCredits };
