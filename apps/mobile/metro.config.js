// Thêm đuôi .sql để Metro bundle được migration Drizzle (đọc qua babel inline-import).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
