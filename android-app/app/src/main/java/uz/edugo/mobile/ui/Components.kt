package uz.edugo.mobile.ui

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

/** Suzuvchi fon nurlari (rolning accent rangida). */
@Composable
fun AppBackground(modifier: Modifier = Modifier) {
    val p = P
    val t = rememberInfiniteTransition(label = "bg")
    val a by t.animateFloat(0f, 1f, infiniteRepeatable(tween(22000, easing = LinearEasing), RepeatMode.Reverse), label = "a")
    val b by t.animateFloat(0f, 1f, infiniteRepeatable(tween(28000, easing = LinearEasing), RepeatMode.Reverse), label = "b")
    Box(
        modifier
            .fillMaxSize()
            .background(p.base)
            .drawBehind {
                val r = size.minDimension * 0.9f
                drawCircle(
                    Brush.radialGradient(listOf(p.accent.copy(alpha = if (p.dark) 0.26f else 0.22f), Color.Transparent), Offset(size.width * (0.95f - 0.25f * a), size.height * (0.05f + 0.15f * a)), r),
                    r, Offset(size.width * (0.95f - 0.25f * a), size.height * (0.05f + 0.15f * a)),
                )
                drawCircle(
                    Brush.radialGradient(listOf(p.accent2.copy(alpha = if (p.dark) 0.18f else 0.16f), Color.Transparent), Offset(size.width * (0.05f + 0.25f * b), size.height * (0.95f - 0.15f * b)), r),
                    r, Offset(size.width * (0.05f + 0.25f * b), size.height * (0.95f - 0.15f * b)),
                )
            },
    )
}

/** Ro'yxat elementlarining birin-ketin chiqishi. */
@Composable
fun Modifier.stagger(index: Int): Modifier {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay((index.coerceAtMost(10) * 55).toLong()); shown = true }
    val v by animateFloatAsState(if (shown) 1f else 0f, tween(520, easing = FastOutSlowInEasing), label = "stagger")
    return this.graphicsLayer { alpha = v; translationY = (1f - v) * 36f; scaleX = 0.98f + 0.02f * v; scaleY = 0.98f + 0.02f * v }
}

/** Bosilganda "buloq" effekti. */
@Composable
fun Modifier.pressable(onClick: () -> Unit): Modifier {
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.97f else 1f, tween(if (pressed) 80 else 380, easing = FastOutSlowInEasing), label = "press")
    return this.scale(s).clickable(interactionSource = src, indication = null, onClick = onClick)
}

@Composable
fun Panel(modifier: Modifier = Modifier, padding: Dp = 16.dp, content: @Composable () -> Unit) {
    val p = P
    Box(
        modifier
            .fillMaxWidth()
            .background(p.surface.copy(alpha = if (p.dark) 0.62f else 0.9f), RoundedCornerShape(22.dp))
            .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(22.dp))
            .padding(padding),
    ) { content() }
}

@Composable
fun Hero(eyebrow: String, title: String, subtitle: String? = null, modifier: Modifier = Modifier) {
    val p = P
    Column(
        modifier
            .fillMaxWidth()
            .background(Brush.linearGradient(listOf(p.accent.copy(alpha = 0.28f), p.surface.copy(alpha = 0.55f))), RoundedCornerShape(26.dp))
            .border(1.dp, p.ink.copy(alpha = 0.10f), RoundedCornerShape(26.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(eyebrow.uppercase(), color = p.accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
        Text(title, color = p.ink, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
        if (subtitle != null) Text(subtitle, color = p.muted, fontSize = 13.sp)
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, color = P.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = modifier.padding(top = 6.dp, bottom = 2.dp))
}

@Composable
fun Pill(text: String, color: Color, modifier: Modifier = Modifier) {
    Text(
        text, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1,
        modifier = modifier.background(color.copy(alpha = 0.16f), CircleShape).padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

@Composable
fun AnimatedProgress(fraction: Float, color: Color, modifier: Modifier = Modifier) {
    val p = P
    var target by remember { mutableStateOf(0f) }
    LaunchedEffect(fraction) { target = fraction.coerceIn(0f, 1f) }
    val v by animateFloatAsState(target, tween(900, easing = FastOutSlowInEasing), label = "progress")
    Box(modifier.fillMaxWidth().height(7.dp).background(p.ink.copy(alpha = 0.10f), CircleShape)) {
        Box(Modifier.fillMaxWidth(v).height(7.dp).background(color, CircleShape))
    }
}

@Composable
fun KpiCard(label: String, value: Int, color: Color, modifier: Modifier = Modifier, suffix: String = "") {
    val p = P
    var go by remember { mutableStateOf(false) }
    LaunchedEffect(value) { go = true }
    val shown by animateFloatAsState(if (go) value.toFloat() else 0f, tween(800, easing = FastOutSlowInEasing), label = "kpi")
    Column(
        modifier
            .background(p.surface.copy(alpha = if (p.dark) 0.6f else 0.92f), RoundedCornerShape(20.dp))
            .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(20.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(label, color = p.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text("${shown.roundToInt()}$suffix", color = color, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
    }
}

@Composable
fun Avatar(name: String, modifier: Modifier = Modifier, size: Dp = 40.dp) {
    val p = P
    Box(modifier.size(size).background(p.accent.copy(alpha = 0.2f), CircleShape), contentAlignment = Alignment.Center) {
        Text(name.trim().take(1).uppercase().ifEmpty { "?" }, color = p.accent, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.42f).sp)
    }
}

@Composable
fun Loading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = P.accent, strokeWidth = 3.dp)
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null) {
    val p = P
    Column(
        Modifier.fillMaxWidth().background(p.coral.copy(alpha = 0.12f), RoundedCornerShape(18.dp)).border(1.dp, p.coral.copy(alpha = 0.3f), RoundedCornerShape(18.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(message, color = p.ink, fontSize = 14.sp)
        if (onRetry != null) Text("Qayta urinish", color = p.coral, fontWeight = FontWeight.Bold, modifier = Modifier.pressable(onRetry).padding(vertical = 4.dp))
    }
}

@Composable
fun EmptyText(text: String) {
    Text(text, color = P.muted, fontSize = 14.sp, modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp, horizontal = 8.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
}

@Composable
fun PrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val p = P
    Box(
        modifier
            .alpha(if (enabled) 1f else 0.5f)
            .background(p.accent, RoundedCornerShape(16.dp))
            .then(if (enabled) Modifier.pressable(onClick) else Modifier)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = if (p.dark) p.base else Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp) }
}

@Composable
fun Gap(h: Dp = 8.dp) = Spacer(Modifier.height(h))

@Composable
fun RowSpaced(content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit) =
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically, content = content)
