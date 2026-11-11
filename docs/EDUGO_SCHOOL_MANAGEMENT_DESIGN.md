# EduGo Premium School Management — Integration Notes

## Scope
This branch introduces the shared Premium Dark / Premium Light visual foundation for the existing EduGo web application (including Capacitor WebView) and the native Kotlin Compose application.

## Visual tokens
- Dark canvas: #0C101D; surfaces: #141B2C / #1D273D.
- Light canvas: #F6F8FC; surfaces: #FFFFFF / #EEF2F9.
- Primary accent: violet (#8B5CF6 dark, #6D48DB light).
- Semantic colors remain stable: green = success, amber = score/pending, coral = warning/error, blue = information.
- Typography: Plus Jakarta Sans / Inter fallback on web; Material typography defaults on native until font assets are added.
- Reduced-motion preference is respected.

## Five role workspaces
The current application already has distinct route trees and navigation components for SUPER_ADMIN, ADMIN, TEACHER, STUDENT and PARENT. This design layer does not merge those workspaces. Existing routes and API integrations are intentionally retained.

## Access-control boundary
Visual role switching is not authorization. The backend must independently validate user identity, school membership, assigned groups and parent-child links for every protected request. Client-side route/navigation filtering is only a usability layer.

## Integration sequence
1. Shared visual tokens and theme parity (this branch).
2. Role-specific navigation and page hierarchy audit.
3. Inner-page redesign using existing API-backed components.
4. Kotlin Compose screen parity.
5. Route-by-route functional and permission testing.

## Validation
Builds and device previews must be run in the project toolchain before merging. This branch is not a claim that the entire School Management module has been redesigned or that backend authorization has been audited.
