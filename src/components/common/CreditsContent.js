import React from 'react';
import PropTypes from 'prop-types';

// Credit Sectionのスタイリングは呼び出し元（親コンポーネント）に依存するため、
// スタイルは親から渡されることを想定します
const CreditsContent = ({ 
  credits, 
  showAcknowledgements = false, 
  creditSectionClass, 
  sectionTitleClass, 
  creditTextClass,
  creditsListClass,
  creditsItemClass
}) => {
  return (
    <>
      {/* 開発者セクション */}
      {credits.development && (
        <div className={creditSectionClass}>
          <h3 className={sectionTitleClass}>{credits.development.title}</h3>
          {credits.development.credits.map((credit, index) => (
            <p key={`dev-${index}`} className={creditTextClass}>{credit}</p>
          ))}
        </div>
      )}

      {/* デザインセクション */}
      {credits.design && (
        <div className={creditSectionClass}>
          <h3 className={sectionTitleClass}>{credits.design.title}</h3>
          {credits.design.credits.map((credit, index) => (
            <p key={`design-${index}`} className={creditTextClass}>{credit}</p>
          ))}
        </div>
      )}

      {/* 素材セクション */}
      {credits.resources && (
        <div className={creditSectionClass}>
          <h3 className={sectionTitleClass}>{credits.resources.title}</h3>
          <ul className={creditsListClass}>
            {credits.resources.listItems.map((item, index) => (
              <li key={`resource-${index}`} className={creditsItemClass}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 謝辞セクション - showAcknowledgementsがtrueの場合のみ表示 */}
      {showAcknowledgements && credits.acknowledgements && (
        <div className={creditSectionClass}>
          <h3 className={sectionTitleClass}>{credits.acknowledgements.title}</h3>
          <p className={creditTextClass}>{credits.acknowledgements.text}</p>
        </div>
      )}
    </>
  );
};

// PropTypesで型を定義
CreditsContent.propTypes = {
  credits: PropTypes.shape({
    development: PropTypes.shape({
      title: PropTypes.string.isRequired,
      credits: PropTypes.arrayOf(PropTypes.string).isRequired
    }),
    design: PropTypes.shape({
      title: PropTypes.string.isRequired,
      credits: PropTypes.arrayOf(PropTypes.string).isRequired
    }),
    resources: PropTypes.shape({
      title: PropTypes.string.isRequired,
      listItems: PropTypes.arrayOf(PropTypes.string).isRequired
    }),
    acknowledgements: PropTypes.shape({
      title: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired
    })
  }).isRequired,
  showAcknowledgements: PropTypes.bool,
  creditSectionClass: PropTypes.string,
  sectionTitleClass: PropTypes.string,
  creditTextClass: PropTypes.string,
  creditsListClass: PropTypes.string,
  creditsItemClass: PropTypes.string
};

export default CreditsContent;