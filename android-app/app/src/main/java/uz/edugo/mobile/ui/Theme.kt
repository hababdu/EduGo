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

/** docs/DESIGN.md dagi rol bo'yicha rang jadvali (veb-ilova bilan bir xil). */
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

fun paletteFor(role: Role, dark: Boolean): Palette {
    // Yagona EduGo brand palette: barcha rollarda bir xil xalqaro EdTech identifikatsiyasi.
    val accent = c(53, 99, 246)
    val accent2 = c(129, 87, 246)
    return if (dark) Palette(
        true, c(15, 19, 38), c(25, 31, 56), c(37, 45, 76), c(246, 247, 255), c(166, 175, 205), c(112, 123, 158),
        accent, accent2, c(255, 190, 74), c(48, 196, 145), c(245, 103, 115), c(73, 174, 255),
    ) else Palette(
        false, c(245, 247, 255), c(255, 255, 255), c(237, 241, 255), c(25, 31, 55), c(104, 114, 145), c(150, 159, 184),
        accent, accent2, c(230, 157, 45), c(20, 164, 123), c(220, 76, 91), c(40, 145, 235),
    )
}

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
        primary = p.accent, onPrimary = p.base, secondary = p.accent2, onSecondary = p.base,
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
