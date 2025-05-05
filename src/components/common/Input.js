'use client';

import React, { forwardRef } from 'react';
import styles from '../../styles/common/Input.module.css';

/**
 * 汎用入力フィールドコンポーネント
 * BEM記法に準拠し、アクセシビリティに配慮した実装
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.id - 入力フィールドのID
 * @param {string} [props.label] - ラベルテキスト
 * @param {string} [props.type='text'] - 入力タイプ
 * @param {string} [props.placeholder] - プレースホルダーテキスト
 * @param {boolean} [props.required=false] - 必須入力かどうか
 * @param {boolean} [props.disabled=false] - 無効状態かどうか
 * @param {boolean} [props.readOnly=false] - 読み取り専用かどうか
 * @param {string} [props.error] - エラーメッセージ
 * @param {string} [props.helperText] - ヘルパーテキスト
 * @param {string} [props.size='medium'] - サイズ ('small', 'medium', 'large')
 * @param {string} [props.variant='default'] - バリアント ('default', 'filled', 'outlined')
 * @param {React.ReactNode} [props.icon] - アイコン要素
 * @param {string} [props.iconPosition='left'] - アイコン位置 ('left', 'right')
 * @param {React.ReactNode} [props.suffix] - 接尾辞要素
 * @param {React.ReactNode} [props.prefix] - 接頭辞要素
 * @param {string} [props.className] - 追加のカスタムクラス名
 * @returns {React.ReactElement}
 */
const Input = forwardRef(({
  id,
  label,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  size = 'medium',
  variant = 'default',
  icon,
  iconPosition = 'left',
  suffix,
  prefix,
  className,
  ...rest
}, ref) => {
  // BEM記法に基づくクラス名の生成
  const inputClasses = [
    styles.input,
    size !== 'medium' ? styles[`input--${size}`] : '',
    variant !== 'default' ? styles[`input--${variant}`] : '',
    disabled ? styles['input--disabled'] : '',
    readOnly ? styles['input--readonly'] : '',
    error ? styles['input--error'] : '',
    icon ? styles['input--with-icon'] : '',
    iconPosition === 'right' ? styles['input--icon-right'] : '',
    suffix ? styles['input--with-suffix'] : '',
    prefix ? styles['input--with-prefix'] : '',
    className
  ].filter(Boolean).join(' ');

  // コンテナクラス名
  const containerClasses = [
    styles.input__container,
    error ? styles['input__container--error'] : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={id} className={styles.input__label}>
          {label}
          {required && <span className={styles.input__required}>*</span>}
        </label>
      )}

      <div className={styles.input__field_wrapper}>
        {prefix && (
          <span className={styles.input__prefix}>{prefix}</span>
        )}
        
        {icon && iconPosition === 'left' && (
          <span className={styles.input__icon}>{icon}</span>
        )}
        
        <input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${id}-helper ${id}-error`}
          {...rest}
        />
        
        {icon && iconPosition === 'right' && (
          <span className={styles.input__icon}>{icon}</span>
        )}
        
        {suffix && (
          <span className={styles.input__suffix}>{suffix}</span>
        )}
      </div>
      
      <div className={styles.input__feedback}>
        {helperText && (
          <p id={`${id}-helper`} className={styles.input__helper_text}>
            {helperText}
          </p>
        )}
        
        {error && (
          <p id={`${id}-error`} className={styles.input__error_text}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;