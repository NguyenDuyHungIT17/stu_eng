// Config plugin: ký APK release bằng keystore truyền qua biến môi trường.
// Cần vì `expo prebuild --clean` sinh lại thư mục android/ mỗi lần build (TK §10).
// Biến môi trường: ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.
// Không có ANDROID_KEYSTORE_PATH thì bản release ký bằng debug keystore (chỉ để thử).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'System.getenv("ANDROID_KEYSTORE_PATH")';

const RELEASE_SIGNING = `
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  const signingOpen = /signingConfigs \{/;
  const releaseBlock =
    /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!signingOpen.test(gradle) || !releaseBlock.test(gradle)) {
    throw new Error(
      '[with-release-signing] Không tìm thấy signingConfigs/buildTypes.release trong app/build.gradle',
    );
  }

  return gradle
    .replace(signingOpen, `signingConfigs {${RELEASE_SIGNING}`)
    .replace(
      releaseBlock,
      `$1signingConfig ${MARKER} ? signingConfigs.release : signingConfigs.debug`,
    );
}

const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
