import type { ConfigContext, ExpoConfig } from 'expo/config';

// Package Android tạm thời. KHÔNG đổi được sau khi đã phát hành: chốt trước bản gửi người thử.
const ANDROID_PACKAGE = 'com.engoats.mobile';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Học tiếng Anh',
  slug: 'english-app',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'englishapp',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: ANDROID_PACKAGE,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-sqlite',
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Ứng dụng cần micro để bạn luyện nói và trò chuyện với AI. Giọng nói được xử lý trên máy.',
        speechRecognitionPermission:
          'Ứng dụng dùng nhận diện giọng nói để chuyển lời bạn nói thành chữ.',
        androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
      },
    ],
    './plugins/with-release-signing',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
