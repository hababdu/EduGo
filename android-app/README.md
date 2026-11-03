# EduGo — Android (Kotlin / Jetpack Compose)

Native ilova. Backend: mavjud NestJS API (`/api/v1/*`), kirish: Telegram bot (`app-login`).

- Rollar: o'quvchi, o'qituvchi (davomat belgilash), admin/super admin, ota-ona
- Rang va animatsiya: `docs/DESIGN.md` jadvali bilan bir xil (`ui/Theme.kt`)
- Backend manzili: `./gradlew assembleDebug -PEDUGO_API_URL=https://...` (standart: production)
- CI: `.github/workflows/android-native.yml` → Releases `app-android-native`

Qilinmagan (keyingi bosqich): push-bildirishnoma (FCM), test topshirish, vazifa yuborish, AI yordamchi, release imzolash.

Imzolangan release (Play Market): GitHub Secrets: EDUGO_KEYSTORE_BASE64, EDUGO_KEYSTORE_PASSWORD, EDUGO_KEY_ALIAS, EDUGO_KEY_PASSWORD. Berilsa CI `assembleRelease` + `bundleRelease` ham bajaradi.
