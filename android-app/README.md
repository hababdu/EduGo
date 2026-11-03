# EduGo — Android (Kotlin / Jetpack Compose)

Native ilova. Backend: mavjud NestJS API (`/api/v1/*`), kirish: Telegram bot (`app-login`).

- Rollar: o'quvchi, o'qituvchi (davomat belgilash), admin/super admin, ota-ona
- Rang va animatsiya: `docs/DESIGN.md` jadvali bilan bir xil (`ui/Theme.kt`)
- Backend manzili: `./gradlew assembleDebug -PEDUGO_API_URL=https://...` (standart: production)
- CI: `.github/workflows/android-native.yml` → Releases `app-android-native`

Qilinmagan (keyingi bosqich): push-bildirishnoma (FCM), test topshirish, vazifa yuborish, AI yordamchi, release imzolash.
