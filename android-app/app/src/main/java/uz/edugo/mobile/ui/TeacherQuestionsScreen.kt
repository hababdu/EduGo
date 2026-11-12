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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.QuestionRow

private fun qs(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
private fun typeUz(t: String) = when (t) { "MULTIPLE_CHOICE" -> "Ko'p javobli"; "TRUE_FALSE" -> "To'g'ri/Noto'g'ri"; "TEXT_ANSWER" -> "Matnli"; else -> "Bitta javob" }
private fun diffUz(d: String) = when (d) { "EASY" -> "Oson"; "HARD" -> "Qiyin"; else -> "O'rta" }

@Composable
private fun Pick(label: String, on: Boolean, onClick: () -> Unit) {
    val p = P
    Text(label, color = if (on) p.accent else p.faint, fontSize = 12.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) p.accent.copy(alpha = 0.16f) else p.surface)
            .pressable(onClick).padding(horizontal = 12.dp, vertical = 7.dp))
}

/** Savollar bazasi: ro'yxat, yangi savol (bitta/ko'p javobli, to'g'ri/noto'g'ri) va o'chirish. */
@Composable
fun TeacherQuestionsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val questions = rememberRemoteList("/api/v1/questions", QuestionRow.serializer())
    var adding by remember { mutableStateOf(false) }
    var type by remember { mutableStateOf("SINGLE_CHOICE") }
    var difficulty by remember { mutableStateOf("MEDIUM") }
    var text by remember { mutableStateOf("") }
    var points by remember { mutableStateOf("1") }
    val options = remember { mutableStateListOf("", "", "", "") }
    val correct = remember { mutableStateListOf(false, false, false, false) }
    var trueIsRight by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    fun reset() { text = ""; points = "1"; for (i in 0..3) { options[i] = ""; correct[i] = false }; trueIsRight = true; adding = false }

    fun buildOptions(): String? {
        if (type == "TRUE_FALSE") return """[{"text":"To'g'ri","isCorrect":$trueIsRight},{"text":"Noto'g'ri","isCorrect":${!trueIsRight}}]"""
        val filled = options.indices.filter { options[it].isNotBlank() }
        if (filled.size < 2) { message = "Kamida 2 ta variant kiriting"; return null }
        val right = filled.count { correct[it] }
        if (right == 0) { message = "To'g'ri javobni belgilang"; return null }
        if (type == "SINGLE_CHOICE" && right != 1) { message = "Bitta javobli savolda faqat bitta to'g'ri javob bo'ladi"; return null }
        return filled.joinToString(",", "[", "]") { """{"text":${qs(options[it].trim())},"isCorrect":${correct[it]}}""" }
    }

    RefreshColumn(listOf(questions)) {
        Hero("EDUGO · TESTLAR", "Savollar bazasi", "Testlarda qayta ishlatiladigan savollar")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        TextButton(onClick = { adding = !adding }) { Text(if (adding) "Yopish" else "+ Yangi savol") }
        if (adding) Panel {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE").forEach { t -> Pick(typeUz(t), type == t) { type = t; for (i in 0..3) correct[i] = false } }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("EASY", "MEDIUM", "HARD").forEach { d -> Pick(diffUz(d), difficulty == d) { difficulty = d } }
                }
                OutlinedTextField(value = text, onValueChange = { text = it }, minLines = 2, modifier = Modifier.fillMaxWidth(), label = { Text("Savol matni") })
                if (type == "TRUE_FALSE") {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Pick("To'g'ri javob: To'g'ri", trueIsRight) { trueIsRight = true }
                        Pick("To'g'ri javob: Noto'g'ri", !trueIsRight) { trueIsRight = false }
                    }
                } else {
                    for (i in 0..3) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(value = options[i], onValueChange = { options[i] = it }, singleLine = true, modifier = Modifier.weight(1f), label = { Text("Variant ${i + 1}") })
                            Pick(if (correct[i]) "✓" else "○", correct[i]) {
                                if (type == "SINGLE_CHOICE") for (j in 0..3) correct[j] = (j == i) else correct[i] = !correct[i]
                            }
                        }
                    }
                }
                OutlinedTextField(value = points, onValueChange = { points = it.filter(Char::isDigit).take(3) }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Ball (1–100)") })
                TextButton(enabled = !busy && text.isNotBlank(), onClick = {
                    message = null
                    val opts = buildOptions() ?: return@TextButton
                    val pts = (points.toIntOrNull() ?: 1).coerceIn(1, 100)
                    busy = true
                    scope.launch {
                        try {
                            api.raw("POST", "/api/v1/questions", """{"type":"$type","difficulty":"$difficulty","text":${qs(text.trim())},"points":$pts,"options":$opts}""")
                            message = "Savol qo'shildi"; reset(); questions.reload()
                        } catch (e: Exception) { message = e.message ?: "Saqlanmadi" } finally { busy = false }
                    }
                }) { Text("Saqlash") }
            }
        }
        Section(questions) { list ->
            SectionTitle("SAVOLLAR · ${list.size}")
            if (list.isEmpty()) EmptyText("Savollar yo'q")
            list.forEach { q ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(q.text, color = p.ink, fontSize = 13.sp, maxLines = 3)
                        Text("${typeUz(q.type)} · ${diffUz(q.difficulty)} · ${q.points} ball", color = p.muted, fontSize = 11.sp)
                        TextButton(enabled = !busy, onClick = {
                            busy = true
                            scope.launch {
                                try { api.raw("DELETE", "/api/v1/questions/${q.id}"); message = "Savol o'chirildi"; questions.reload() }
                                catch (e: Exception) { message = e.message ?: "O'chirilmadi" } finally { busy = false }
                            }
                        }) { Text("O'chirish", color = p.coral) }
                    }
                }
            }
        }
    }
}
