// Tắt liên kết native (autolinking) của các thư viện app không dùng.
// react-native-gesture-handler bị pnpm tự cài làm peer của react-native-drawer-layout (kèm expo-router),
// nhưng app không dùng drawer. Phần C++ của nó có đường dẫn vượt 260 ký tự trên Windows, làm build arm64 lỗi.
// Nếu sau này cần cử chỉ vuốt: bỏ dòng này, bật Long Paths trên Windows và nâng ninja (xem LENH.md).
module.exports = {
  dependencies: {
    'react-native-gesture-handler': { platforms: { android: null } },
  },
};
