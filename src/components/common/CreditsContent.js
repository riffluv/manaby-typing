import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

// Credit Sectionのスタイリングは呼び出し元（親コンポーネント）に依存するため、
// スタイルは親から渡されることを想定します
const CreditsContent = ({
  credits,
  showAcknowledgements = false,
  creditSectionClass,
  sectionTitleClass,
  creditTextClass,
  creditsListClass,
  creditsItemClass,
}) => {
  // アニメーション設定
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 開発者セクション */}
      {credits.development && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className={sectionTitleClass}>{credits.development.title}</h3>
          {credits.development.credits.map((credit, index) => (
            <p key={`dev-${index}`} className={creditTextClass}>
              {credit}
            </p>
          ))}
        </motion.div>
      )}

      {/* デザインセクション */}
      {credits.design && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className={sectionTitleClass}>{credits.design.title}</h3>
          {credits.design.credits.map((credit, index) => (
            <p key={`design-${index}`} className={creditTextClass}>
              {credit}
            </p>
          ))}
        </motion.div>
      )}

      {/* 技術セクション */}
      {credits.technology && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className={sectionTitleClass}>{credits.technology.title}</h3>
          {credits.technology.credits.map((tech, index) => (
            <p key={`tech-${index}`} className={creditTextClass}>
              {tech}
            </p>
          ))}
        </motion.div>
      )}

      {/* 素材セクション */}
      {credits.resources && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h3 className={sectionTitleClass}>{credits.resources.title}</h3>
          <ul className={creditsListClass}>
            {credits.resources.listItems.map((item, index) => (
              <li key={`resource-${index}`} className={creditsItemClass}>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 謝辞セクション - showAcknowledgementsがtrueの場合のみ表示 */}
      {showAcknowledgements && credits.acknowledgements && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h3 className={sectionTitleClass}>
            {credits.acknowledgements.title}
          </h3>
          <p className={creditTextClass}>{credits.acknowledgements.text}</p>
        </motion.div>
      )}

      {/* ライセンスセクション */}
      {credits.license && (
        <motion.div
          className={creditSectionClass}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ marginTop: '10px' }}
        >
          <h3 className={sectionTitleClass}>{credits.license.title}</h3>
          <p className={creditTextClass}>{credits.license.text}</p>
        </motion.div>
      )}
    </div>
  );
};

// PropTypesで型を定義
CreditsContent.propTypes = {
  credits: PropTypes.shape({
    development: PropTypes.shape({
      title: PropTypes.string.isRequired,
      credits: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    design: PropTypes.shape({
      title: PropTypes.string.isRequired,
      credits: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    technology: PropTypes.shape({
      title: PropTypes.string.isRequired,
      credits: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    resources: PropTypes.shape({
      title: PropTypes.string.isRequired,
      listItems: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    acknowledgements: PropTypes.shape({
      title: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
    license: PropTypes.shape({
      title: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
  }).isRequired,
  showAcknowledgements: PropTypes.bool,
  creditSectionClass: PropTypes.string,
  sectionTitleClass: PropTypes.string,
  creditTextClass: PropTypes.string,
  creditsListClass: PropTypes.string,
  creditsItemClass: PropTypes.string,
};

export default CreditsContent;
