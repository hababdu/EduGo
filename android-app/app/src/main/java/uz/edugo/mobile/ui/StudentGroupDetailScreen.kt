package uz.edugo.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.LessonItem
import uz.edugo.mobile.data.Standing

@Composable
fun StudentGroupDetailScreen(groupId: String, onBack: () -> Unit, openLesson: (String) -> Unit) {
    val p = P
    val context = LocalContext.current
    val group = rememberRemote("/api/v1/groups/$groupId", GroupItem.serializer())
    val assignments = rememberRemoteList("/api/v1/dashboard/assignments", LessonItem.serializer())
    val standing = rememberRemoteList("/api/v1/dashboard/standing", Standing.serializer())
    RefreshColumn(listOf(group, assignments, standing)) {
        BackHeader("Guruh", onBack)
        Section(group) { g ->
            Hero("Mening guruhim", g.name, g.description)
            KpiRow(listOf(
                Triple("A'zolar", g.memberCount, p.accent),
                Triple("Materiallar", (assignments.state as? UiState.Ready)?.value?.count { it.groupId == groupId } ?: 0, p.teal),
            ))
            g.teacher?.let { teacher ->
                val name = listOfNotNull(teacher.firstName, teacher.lastName).joinToString(" ").ifBlank { "O'qituvchi" }
                Panel { Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("O'qituvchi", color = p.faint, fontSize = 11.sp)
                    Text(name, color = p.ink, fontWeight = FontWeight.SemiBold)
                } }
            }
            val schedule = g.lessonDays.orEmpty().mapNotNull { day ->
                listOf("Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak").getOrNull(day - 1)
            }.joinToString(" · ")
            if (schedule.isNotBlank() || g.lessonStartTime != null || g.room != null) {
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text("Dars jadvali", color = p.faint, fontSize = 11.sp)
                        if (schedule.isNotBlank()) Text(schedule, color = p.ink, fontWeight = FontWeight.SemiBold)
                        if (g.lessonStartTime != null) Text("${g.lessonStartTime} – ${g.lessonEndTime.orEmpty()}", color = p.muted, fontSize = 12.sp)
                        g.room?.let { Text("Xona: $it", color = p.muted, fontSize = 12.sp) }
                    }
                }
            }
            if (g.maxCapacity != null && g.maxCapacity > 0) {
                Text("Guruh sig'imi: ${g.memberCount}/${g.maxCapacity}", color = p.muted, fontSize = 12.sp)
                AnimatedProgress(g.memberCount.toFloat() / g.maxCapacity, p.accent)
            }
            if (!g.telegramChatUrl.isNullOrBlank()) {
                PrimaryButton("Telegram guruhiga o'tish ↗", modifier = Modifier.fillMaxWidth(), onClick = {
                    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(g.telegramChatUrl))) }
                })
            }
        }
        Section(standing) { rows ->
            rows.firstOrNull { it.groupId == groupId }?.let {
                SectionTitle("Davomat va to'lov")
                StandingList(listOf(it))
            }
        }
        Section(assignments) { all ->
            val items = all.filter { it.groupId == groupId }
            SectionTitle("Materiallar · ${items.size}")
            if (items.isEmpty()) EmptyText("Guruhda hali material yo'q")
            items.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index).pressable { openLesson(item.id) }) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(item.title, color = p.ink, fontWeight = FontWeight.SemiBold)
                            Text(item.category, color = p.muted, fontSize = 11.sp)
                        }
                        Text("Ochish →", color = p.accent, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
