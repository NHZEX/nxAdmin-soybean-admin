import { defineConfig } from '@soybeanjs/eslint-config';

export default defineConfig(
  {
    vue: true,
    unocss: true,
    prettierRules: {
      /** 每一行的宽度 */
      printWidth: 120,
      /** 是否采用单引号 */
      singleQuote: true,
      /** 对象或者数组的最后一个元素后面不要加逗号 */
      trailingComma: 'none',
      /** 箭头函数的参数无论有几个，都要括号包裹 */
      arrowParens: 'avoid',
      /** 空格敏感性 */
      htmlWhitespaceSensitivity: 'ignore',
      /** 是否加分号 */
      semi: true,
      /** 在对象中的括号之间是否用空格来间隔 */
      bracketSpacing: true,
      /** 换行符的使用 */
      endOfLine: 'lf'
    }
  },
  {
    languageOptions: {
      globals: {}
    },
    rules: {
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index', 'App', 'Register', '[id]', '[url]']
        }
      ],
      'vue/component-name-in-template-casing': [
        'warn',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^icon-/']
        }
      ],
      'unocss/order-attributify': 'off',
      // === 自定义规则开始 ===
      'no-warning-comments': 'warn',
      'no-continue': 'off',
      'no-control-regex': 'off',
      'no-plusplus': 'off',
      'no-else-return': 'off',
      'no-unused-vars': 'warn',
      'vue/no-unused-vars': 'warn',
      '@typescript-eslint/no-unused-vars': 'off' // 必须使用 off，不然提示插件找不到
    }
  }
);
