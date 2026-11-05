package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import uz.edugo.mobile.data.AdminStudentDetailData
import uz.edugo.mobile.data.AdjustStudentScoreBody

@Composable
fun AdminStudentDetailScreen(id: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/admin/students/$id", AdminStudentDetailData.serializer())
    var amount by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var blockConfirm by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val data = (remote.state as? UiState.Ready)?.value
    RefreshColumn(listOf(remote)) {
        BackHeader("O'quvchi profili", onBack)
        Section(remote) { student ->
            val name = listOf(student.firstName, student.lastName.orEmpty()).joinToString(" ").trim().ifBlank { student.username ?: "O'quvchi" }
            Hero("Administrator", name, student.username?.let { "@$it" } ?: "EduGo o'quvchi profili")
            KpiRow(listOf(
                Triple("Umumiy ball", student.studentProfile?.totalScore ?: 0, p.gold),
                Triple("Daraja", student.studentProfile?.level ?: 1, p.accent),
                Triple("Streak", student.streak?.currentStreak ?: 0, p.coral),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        SectionTitle("Hisob holati")
                        Pill(if (student.status == "BLOCKED") "Bloklangan" else "Faol", if (student.status == "BLOCKED") p.coral else p.teal)
                    }
                    PrimaryButton(if (student.status == "BLOCKED") "Blokdan chiqarish" else "O'quvchini bloklash",
                        enabled = !busy, modifier = Modifier.fillMaxWidth(),
                        onClick = { blockConfirm = true })
                }
            }
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    SectionTitle("Ballni qo'lda o'zgartirish")
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(-50, -10, 10, 50, 100).forEach { value ->
                            Text(if (value > 0) "+$value" else value.toString(), color = if (value > 0) p.teal else p.coral,
                                modifier = Modifier.background(p.raised, RoundedCornerShape(18.dp)).pressable { amount = value.toString() }.padding(horizontal = 10.dp, vertical = 8.dp), fontSize = 11.sp)
                        }
                    }
                    BasicTextField(amount, { amount = it.filter { ch -> ch.isDigit() || ch == '-' }.take(8) }, singleLine = true,
                        textStyle = TextStyle(color = p.ink, fontSize = 14.sp), cursorBrush = SolidColor(p.accent),
                        modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(12.dp),
                        decorationBox = { inner -> if (amount.isEmpty()) Text("Ball miqdori (+ yoki -)", color = p.faint); inner() })
                    BasicTextField(reason, { reason = it.take(300) }, singleLine = false,
                        textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                        modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(12.dp),
                        decorationBox = { inner -> if (reason.isEmpty()) Text("Sabab (audit jurnaliga yoziladi)", color = p.faint); inner() })
                    PrimaryButton(if (busy) "Saqlanmoqda…" else "Ballni yangilash",
                        enabled = !busy && amount.toIntOrNull()?.let { it != 0 } == true && reason.trim().length >= 3,
                        modifier = Modifier.fillMaxWidth(), onClick = {
                            busy = true; message = null
                            scope.launch {
                                runCatching {
                                    api.send("PATCH", "/api/v1/admin/students/$id/score", AdjustStudentScoreBody.serializer(),
                                        AdjustStudentScoreBody(amount.toInt(), reason.trim()))
                                    amount = ""; reason = ""; remote.reload(); message = "Ball yangilandi"
                                }.onFailure { message = it.message ?: "Ball o'zgartirilmadi" }
                                busy = false
                            }
                        })
                    message?.let { Text(it, color = if (it == "Ball yangilandi") p.teal else p.coral, fontSize = 11.sp) }
                }
            }
            SectionTitle("So'nggi test natijalari")
            if (student.testAttempts.isEmpty()) EmptyText("Test urinishlari topilmadi")
            student.testAttempts.forEachIndexed { index, attempt ->
                Panel(Modifier.stagger(index)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(attempt.test.title.ifBlank { "Test" }, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text(fmtDue(attempt.createdAt), color = p.faint, fontSize = 10.sp)
                        }
                        Pill("${attempt.score.toInt()}/${attempt.maxScore.toInt()}", if (attempt.passed) p.teal else p.coral)
                    }
                }
            }
        }
    }
    if (blockConfirm && data != null) {
        val blocked = data.status == "BLOCKED"
        AlertDialog(
            onDismissRequest = { blockConfirm = false },
            title = { Text(if (blocked) "Blokdan chiqarilsinmi?" else "O'quvchi bloklansinmi?") },
            text = { Text(if (blocked) "O'quvchi yana EduGo tizimidan foydalana oladi." else "O'quvchi EduGo tizimidan vaqtincha foydalana olmaydi.") },
            confirmButton = { TextButton(enabled = !busy, onClick = {
                blockConfirm = false; busy = true
                scope.launch {
                    runCatching {
                        api.raw("PATCH", "/api/v1/admin/students/$id/${if (blocked) "unblock" else "block"}", "{}")
                        remote.reload()
                    }.onFailure { message = it.message ?: "Holat o'zgartirilmadi" }
                    busy = false
                }
            }) { Text(if (blocked) "Blokdan chiqarish" else "Bloklash") } },
            dismissButton = { TextButton(onClick = { blockConfirm = false }) { Text("Bekor qilish") } },
        )
    }
}
