// inline-import: nhúng nội dung file .sql (migration Drizzle) thành chuỗi lúc bundle. Xem TK §5.
module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
