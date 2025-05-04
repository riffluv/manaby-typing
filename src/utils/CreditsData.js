// クレジット情報を一元管理するファイル
// プロジェクト全体で共通のクレジット情報を管理します

export const creditsData = {
  // 開発セクション
  development: {
    title: '企画・開発',
    credits: ['開発者名', 'プログラマー名'],
  },

  // デザインセクション
  design: {
    title: 'デザイン・UI',
    credits: ['UIデザイナー名', 'グラフィックデザイナー名'],
  },

  // 技術セクション
  technology: {
    title: '使用技術',
    credits: ['Next.js & React', 'Framer Motion', 'Web Audio API'],
  },

  // 素材セクション
  resources: {
    title: '素材',
    listItems: [
      'アイコン素材: Material Design Icons',
      'フォント: Noto Sans JP (Google Fonts)',
      '効果音: freesound.org (CC0)',
      'BGM: xylophone-mini-dessert by Alex (CC BY 4.0)',
    ],
  },

  // 謝辞セクション（詳細なクレジット画面でのみ表示）
  acknowledgements: {
    title: '謝辞',
    text: 'このゲームの開発にあたり、多くの方々のサポートをいただきました。テスト協力や貴重なフィードバックをくださった皆様に感謝申し上げます。',
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
    creditsData.design,
    creditsData.technology,
    creditsData.resources,
    creditsData.license,
  ];
};

// 完全なクレジットセクション（専用画面表示用）
export const getFullCredits = () => {
  return [
    creditsData.development,
    creditsData.design,
    creditsData.technology,
    creditsData.resources,
    creditsData.acknowledgements,
    creditsData.license,
  ];
};

export default { creditsData, getSimpleCredits, getFullCredits };
