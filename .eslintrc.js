module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'max-len': ['error', { code: 120 }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'consistent-return': 'off',
    'no-param-reassign': 'off',
    'prefer-destructuring': 'off',
    'no-restricted-syntax': 'off',
    'guard-for-in': 'off',
  },
}; 