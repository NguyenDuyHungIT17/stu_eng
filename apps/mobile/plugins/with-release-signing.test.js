const { applyReleaseSigning } = require('./with-release-signing');

const GRADLE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

describe('applyReleaseSigning', () => {
  it('thêm signingConfigs.release đọc từ biến môi trường', () => {
    const out = applyReleaseSigning(GRADLE);
    expect(out).toContain('release {\n            if (System.getenv("ANDROID_KEYSTORE_PATH"))');
    expect(out).toContain('storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))');
    expect(out).toContain('keyAlias System.getenv("ANDROID_KEY_ALIAS")');
  });

  it('buildTypes.release dùng khoá release khi có keystore, còn debug giữ nguyên', () => {
    const out = applyReleaseSigning(GRADLE);
    expect(out).toContain(
      'signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug',
    );
    expect(out.match(/signingConfig signingConfigs\.debug\n/g)).toHaveLength(1);
  });

  it('chạy nhiều lần không chèn trùng', () => {
    const once = applyReleaseSigning(GRADLE);
    expect(applyReleaseSigning(once)).toBe(once);
  });

  it('báo lỗi nếu template gradle đổi cấu trúc', () => {
    expect(() => applyReleaseSigning('android {}')).toThrow(/with-release-signing/);
  });
});
