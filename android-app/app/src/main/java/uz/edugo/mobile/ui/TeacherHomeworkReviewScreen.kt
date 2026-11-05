package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.ReviewHomeworkBody
import uz.edugo.mobile.data.ReturnHomeworkBody
import uz.edugo.mobile.data.TeacherGroupAssignmentStat
import uz.edugo.mobile.data.TeacherSubmission
import uz.edugo.mobile.data.TeacherSubmissionsData

@Composable
fun TeacherGroupAssignments(groupId: String, openAssignment: (String) -> Unit) {
    val p = P
    val remote = rememberRemoteList("/api/v1/teacher/groups/$groupId/submission-stats", TeacherGroupAssignmentStat.serializer())
    RefreshColumn(listOf(remote)) {
        Section(remote) { list ->
            SectionTitle("Uy vazifalari · ${list.size}")
            if (list.isEmpty()) EmptyText("Guruhda e'lon qilingan uy vazifalari yo'q")
            list.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index).pressable { openAssignment(item.id) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text(item.title, color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text("Topshirgan: ${item.submitted}/${item.total} · Baholangan: ${item.graded}", color = p.muted, fontSize = 12.sp)
                        AnimatedProgress(item.graded.toFloat() / item.total.coerceAtLeast(1), p.teal)
                        item.dueAt?.let { Text("Muddat: ${fmtDue(it)}", color = p.gold, fontSize = 11.sp) }
                        Text("Javoblarni ko'rish →", color = p.accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
fun TeacherHomeworkReviewScreen(assignmentId: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/submissions/assignments/$assignmentId", TeacherSubmissionsData.serializer())
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    RefreshColumn(listOf(remote)) {
        BackHeader("Vazifa javoblari", onBack)
        Section(remote) { data ->
            Hero("Baholash", data.assignment.title, "O'quvchilar javoblari va o'qituvchi bahosi")
            KpiRow(listOf(
                Triple("Jami", data.summary.total, p.accent),
                Triple("Topshirgan", data.summary.submitted, p.sky),
                Triple("Baholangan", data.summary.graded, p.teal),
            ))
            KpiRow(listOf(
                Triple("Tekshirish", data.summary.needsReview, p.gold),
                Triple("Xato", data.summary.failed, p.coral),
                Triple("O'rtacha", data.summary.average ?: 0, p.accent2),
            ))
            message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
            data.rows.forEachIndexed { index, row ->
                val sub = row.submission
                val studentName = listOfNotNull(row.student.firstName, row.student.lastName).joinToString(" ").ifBlank { row.student.username ?: "O'quvchi" }
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(studentName, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(sub?.status?.let(::reviewStatus) ?: "Topshirmagan", sub?.status?.let { reviewColor(it, p) } ?: p.faint)
                        }
                        if (sub == null) {
                            Text("Hali javob yuborilmagan", color = p.muted, fontSize = 12.sp)
                        } else {
                            sub.textAnswer?.takeIf { it.isNotBlank() }?.let {
                                Text("Javob:", color = p.faint, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text(it, color = p.ink, fontSize = 13.sp)
                            }
                            sub.files.forEach { file ->
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("📎 ${file.fileName}", color = p.ink, fontSize = 12.sp, modifier = Modifier.weight(1f))
                                    Text("Telegramga yuborish", color = p.accent, fontSize = 10.sp, modifier = Modifier.pressable {
                                        scope.launch {
                                            runCatching { api.raw("POST", "/api/v1/materials/files/${file.id}/send-to-chat", "{}") }
                                                .onFailure { message = it.message ?: "Fayl yuborilmadi" }
                                        }
                                    }.padding(start = 6.dp))
                                }
                            }
                            sub.aiFeedback?.takeIf { it.isNotBlank() }?.let { Text("AI izohi: $it", color = p.muted, fontSize = 12.sp) }
                            if (sub.gradeError != null) Text(sub.gradeError, color = p.coral, fontSize = 12.sp)
                            var score by remember(sub.id) { mutableStateOf(sub.teacherScore?.toInt()?.toString() ?: sub.finalScore?.toInt()?.toString() ?: "") }
                            var feedback by remember(sub.id) { mutableStateOf(sub.teacherFeedback.orEmpty()) }
                            var returnNote by remember(sub.id) { mutableStateOf("Iltimos, javobni to'ldirib qayta yuboring") }
                            Text("O'qituvchi bahosi · max ${data.assignment.maxScore}", color = p.muted, fontSize = 12.sp)
                            ReviewField(score, { score = it.filter(Char::isDigit).take(4) }, "Ball")
                            ReviewField(feedback, { feedback = it }, "Izoh (ixtiyoriy)")
                            PrimaryButton(
                                if (busyId == sub.id) "Saqlanmoqda…" else "Baholashni saqlash",
                                enabled = busyId == null && score.toIntOrNull()?.let { it in 0..data.assignment.maxScore } == true,
                                modifier = Modifier.fillMaxWidth(),
                                onClick = {
                                    busyId = sub.id
                                    scope.launch {
                                        runCatching {
                                            api.send("PATCH", "/api/v1/submissions/${sub.id}/review", ReviewHomeworkBody.serializer(), ReviewHomeworkBody(score.toInt(), feedback.trim().ifBlank { null }))
                                            remote.reload()
                                        }.onFailure { message = it.message ?: "Baholash saqlanmadi" }
                                        busyId = null
                                    }
                                },
                            )
                            ReviewField(returnNote, { returnNote = it }, "Qaytarish sababi")
                            Text("Tuzatish uchun qaytarish", color = p.coral, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.pressable {
                                    if (returnNote.trim().length >= 3 && busyId == null) {
                                        busyId = sub.id
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/submissions/${sub.id}/return", ReturnHomeworkBody.serializer(), ReturnHomeworkBody(returnNote.trim()))
                                                remote.reload()
                                            }.onFailure { message = it.message ?: "Qaytarib bo'lmadi" }
                                            busyId = null
                                        }
                                    } else message = "Qaytarish sababi kamida 3 ta belgidan iborat bo'lsin"
                                }.padding(vertical = 8.dp))
                        }
                    }
                }
            }
        }
    }
}

private fun reviewStatus(status: String) = when (status) {
    "GRADED" -> "Baholandi"
    "NEEDS_REVIEW" -> "Tekshirish"
    "FAILED" -> "Xatolik"
    "RETURNED" -> "Qaytarildi"
    "SUBMITTED" -> "Topshirildi"
    else -> status
}

private fun reviewColor(status: String, p: Palette) = when (status) {
    "GRADED" -> p.teal
    "NEEDS_REVIEW", "SUBMITTED" -> p.gold
    "FAILED", "RETURNED" -> p.coral
    else -> p.sky
}

@Composable
private fun ReviewField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    val p = P
    BasicTextField(
        value = value, onValueChange = onValueChange,
        textStyle = TextStyle(color = p.ink, fontSize = 13.sp),
        cursorBrush = SolidColor(p.accent),
        modifier = Modifier.fillMaxWidth().background(p.raised.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 11.dp),
        decorationBox = { inner -> if (value.isEmpty()) Text(placeholder, color = p.faint, fontSize = 12.sp); inner() },
    )
}
