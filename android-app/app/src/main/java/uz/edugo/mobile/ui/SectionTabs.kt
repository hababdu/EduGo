package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Bir bo'lim ichidagi yaqin sahifalar uchun tablar (web'dagi `SectionTabs` bilan bir xil g'oya).
 * Pastki menyu qisqa qoladi; o'xshash ekranlar bitta bo'lim ichida.
 */
@Composable
fun SectionTabs(key: String, titles: List<String>, content: @Composable (Int) -> Unit) {
    val p = P
    var index by rememberSaveable(key) { mutableIntStateOf(0) }
    Column {
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            titles.forEachIndexed { i, t ->
                val on = i == index
                Text(
                    t,
                    color = if (on) p.accent else p.faint,
                    fontWeight = if (on) FontWeight.Bold else FontWeight.Medium,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (on) p.accent.copy(alpha = 0.16f) else p.surface)
                        .pressable { index = i }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        content(index)
    }
}
