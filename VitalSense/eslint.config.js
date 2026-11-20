import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
export default [
  {ignores:['dist/**']},
  js.configs.recommended,
  {files:['src/**/*.{js,jsx}'], languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:globals.browser,parserOptions:{ecmaFeatures:{jsx:true}}}, plugins:{'react-hooks':reactHooks}, rules:{...reactHooks.configs.recommended.rules,'no-unused-vars':['error',{varsIgnorePattern:'^[A-Z_]',argsIgnorePattern:'^[A-Z_]'}]}},
  {files:['server/**/*.mjs','tests/**/*.mjs'],languageOptions:{globals:globals.node}},
];
