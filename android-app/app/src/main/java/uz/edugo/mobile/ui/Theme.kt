package uz.edugo.mobile.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/** Shared EduGo Premium palette. Keep semantic colors consistent across every role. */
enum class Role { STUDENT, TEACHER, ADMIN, SUPER, PARENT }

fun roleOf(s: String?): Role = when (s) {
    "TEACHER" -> Role.TEACHER
    "ADMIN" -> Role.ADMIN
    "SUPER_ADMIN" -> Role.SUPER
    "PARENT" -> Role.PARENT
    else -> Role.STUDENT
}

@Immutable
class Palette(
    val dark: Boolean,
    val base: Color,
    val surface: Color,
    val raised: Color,
    val ink: Color,
    val muted: Color,
    val faint: Color,
    val accent: Color,
    val accent2: Color,
    val gold: Color,
    val teal: Color,
    val coral: Color,
    val sky: Color,
)

private fun c(r: Int, g: Int, b: Int) = Color(r, g, b)

/** Role is intentionally not used to encode permissions; all workspaces share one visual language. */
fun paletteFor(role: Role, dark: Boolean): Palette = if (dark) Palette(
    true,
    c(12, 16, 29), c(20, 27, 44), c(29, 39, 61),
    c(241, 245, 249), c(157, 169, 190), c(111, 126, 151),
    c(139, 92, 246), c(99, 102, 241),
    c(245, 183, 85), c(52, 211, 153), c(251, 113, 133), c(96, 165, 250),
) else Palette(
    false,
    c(246, 248, 252), c(255, 255, 255), c(238, 242, 249),
    c(26, 36, 55), c(91, 107, 132), c(132, 146, 168),
    c(109, 72, 219), c(79, 70, 229),
    c(184, 124, 36), c(5, 150, 105), c(225, 75, 95), c(37, 117, 205),
)

val LocalPalette = staticCompositionLocalOf { paletteFor(Role.STUDENT, true) }
val LocalThemeMode = staticCompositionLocalOf { "system" }
val LocalSetThemeMode = staticCompositionLocalOf<(String) -> Unit> { {} }

val P: Palette
    @Composable @ReadOnlyComposable get() = LocalPalette.current

@Composable
fun EduGoTheme(role: Role, themeMode: String = "system", content: @Composable () -> Unit) {
    val dark = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }
    val p = paletteFor(role, dark)
    val scheme = if (dark) darkColorScheme(
        primary = p.accent, onPrimary = Color.White, secondary = p.accent2, onSecondary = Color.White,
        background = p.base, onBackground = p.ink, surface = p.surface, onSurface = p.ink,
        surfaceVariant = p.raised, onSurfaceVariant = p.muted, error = p.coral, outline = p.faint,
    ) else lightColorScheme(
        primary = p.accent, onPrimary = Color.White, secondary = p.accent2, onSecondary = Color.White,
        background = p.base, onBackground = p.ink, surface = p.surface, onSurface = p.ink,
        surfaceVariant = p.raised, onSurfaceVariant = p.muted, error = p.coral, outline = p.faint,
    )
    CompositionLocalProvider(LocalPalette provides p) {
        MaterialTheme(colorScheme = scheme, content = content)
    }
}
