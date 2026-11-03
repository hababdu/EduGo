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
    val (accent, accent2) = if (dark) when (role) {
        Role.STUDENT -> c(255, 176, 32) to c(52, 208, 160)
        Role.TEACHER -> c(45, 212, 140) to c(56, 189, 248)
        Role.ADMIN -> c(129, 140, 248) to c(255, 176, 32)
        Role.SUPER -> c(192, 132, 252) to c(56, 189, 248)
        Role.PARENT -> c(34, 211, 238) to c(255, 176, 32)
    } else when (role) {
        Role.STUDENT -> c(200, 124, 0) to c(14, 146, 110)
        Role.TEACHER -> c(5, 150, 105) to c(8, 128, 186)
        Role.ADMIN -> c(79, 70, 229) to c(200, 124, 0)
        Role.SUPER -> c(126, 34, 206) to c(8, 128, 186)
        Role.PARENT -> c(8, 145, 178) to c(200, 124, 0)
    }
    return if (dark) Palette(
        true, c(11, 13, 25), c(18, 22, 42), c(30, 36, 71), c(245, 243, 237), c(156, 163, 196), c(91, 95, 130),
        accent, accent2, c(255, 176, 32), c(52, 208, 160), c(240, 101, 75), c(56, 189, 248),
    ) else Palette(
        false, c(223, 228, 240), c(255, 255, 255), c(208, 216, 234), c(28, 33, 58), c(84, 92, 124), c(140, 148, 178),
        accent, accent2, c(200, 124, 0), c(14, 146, 110), c(210, 68, 46), c(8, 128, 186),
    )
}

val LocalPalette = staticCompositionLocalOf { paletteFor(Role.STUDENT, true) }

val P: Palette
    @Composable @ReadOnlyComposable get() = LocalPalette.current

@Composable
fun EduGoTheme(role: Role, content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
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
