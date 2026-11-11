package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.StudentTimetableSlot

private val DAYS = listOf("Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba")

/**
 * Haftalik dars jadvali (faqat ko'rish). `path`:
 *  - o'qituvchi/o'quvchi: /api/v1/timetable/mine
 *  - maktab admini: /api/v1/admin/teaching/timetable
 */
@Composable
fun TimetableScreen(path: String, title: String = "Dars jadvali", showTeacher: Boolean = true) {
    val p = P
    val remote = rememberRemoteList(path, StudentTimetableSlot.serializer())
    RefreshColumn(listOf(remote)) {
        Hero("EDUGO · JADVAL", title, "Haftalik darslar (Toshkent vaqti)")
        Section(remote) { slots ->
            if (slots.isEmpty()) EmptyText("Hozircha dars jadvali yo'q")
            (1..7).forEach { d ->
                val day = slots.filter { it.weekday == d }.sortedBy { it.startTime }
                if (day.isNotEmpty()) {
                    SectionTitle(DAYS[d - 1].uppercase())
                    day.forEach { s ->
                        Panel {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(s.subject.ifBlank { "Dars" }, color = p.ink, fontWeight = FontWeight.Bold)
                                    Text(
                                        buildString {
                                            append(s.group.name)
                                            if (showTeacher && s.teacher.name.isNotBlank()) append(" · ${s.teacher.name}")
                                            s.room?.let { append(" · $it-xona") }
                                        },
                                        color = p.muted, fontSize = 11.sp,
                                    )
                                }
                                Text("${s.startTime}–${s.endTime}", color = p.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
