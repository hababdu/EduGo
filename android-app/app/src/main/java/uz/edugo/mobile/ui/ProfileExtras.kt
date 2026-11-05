package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.ActivityDayData
import uz.edugo.mobile.data.CertificateMineItem
import uz.edugo.mobile.data.StudentActivityData

@Composable
fun StudentProfileExtras() {
    val p = P
    val certificates = rememberRemoteList("/api/v1/certificates/mine", CertificateMineItem.serializer())
    val activity = rememberRemote("/api/v1/dashboard/activity?days=120", StudentActivityData.serializer())
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Section(certificates) { items ->
            if (items.isNotEmpty()) {
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle("Sertifikatlarim · ${items.size}")
                        items.forEach { item ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(Modifier.weight(1f)) {
                                    Text(item.title, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                                    Text("${item.groupName} · ${fmtDue(item.issuedAt)}", color = p.muted, fontSize = 10.sp)
                                }
                                Pill(item.code, p.gold)
                            }
                        }
                    }
                }
            }
        }
        Section(activity) { data ->
            val days = data.days.takeLast(120)
            val totalXp = days.sumOf { it.xp }
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    SectionTitle("O'qish faolligi")
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("${data.activeDays} faol kun", color = p.teal, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("${totalXp} XP · 120 kun", color = p.gold, fontSize = 12.sp)
                    }
                    val chunks = days.chunked(12)
                    chunks.forEach { chunk ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            chunk.forEach { day ->
                                val alpha = when {
                                    day.count <= 0 -> 0.08f
                                    day.xp >= 60 -> 1f
                                    day.xp >= 30 -> 0.75f
                                    day.xp >= 10 -> 0.5f
                                    else -> 0.28f
                                }
                                Column(Modifier.weight(1f).background(p.gold.copy(alpha = alpha), RoundedCornerShape(4.dp)).padding(vertical = 8.dp)) {}
                            }
                            repeat(12 - chunk.size) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                    Text("Rang qanchalik yorqin bo'lsa, shu kundagi faollik shunchalik yuqori.", color = p.faint, fontSize = 10.sp)
                }
            }
        }
    }
}
