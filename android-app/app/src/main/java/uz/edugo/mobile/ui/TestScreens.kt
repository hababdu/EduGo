package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.AnswerBody
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.AssignedTest
import uz.edugo.mobile.data.SessionTime
import uz.edugo.mobile.data.SubmitResult
import uz.edugo.mobile.data.TestSession

@Composable
fun StudentTests(openTest: (String) -> Unit) {
    val p = P
    val r = rememberRemoteList("/api/v1/tests/assigned/me", AssignedTest.serializer())
    RefreshColumn(listOf(r)) {
        Hero("BILIMINGIZNI SINANG", "Testlarim", "Bilimingizni tekshiring va natijalaringizni kuzating")
        Section(r) { list ->
            if (list.isEmpty()) EmptyText("Hozircha test biriktirilmagan")
            list.forEachIndexed { i, t ->
                val canStart = t.status == "PENDING" || t.status == "RETAKE_AVAILABLE"
                Panel(Modifier.stagger(i)) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(t.title, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                val meta = listOfNotNull("${t.durationSeconds / 60} daqiqa", t.deadline?.let { "muddat ${fmtDue(it)}" }).joinToString(" · ")
                                Text("⏱  $meta", color = p.muted, fontSize = 12.sp)
                            }
                            when (t.status) {
                                "COMPLETED" -> Pill(
                                    t.score?.let { "${it.toInt()}/${(t.maxScore ?: 0.0).toInt()}" } ?: "Topshirilgan",
                                    if (t.passed == true) p.teal else p.coral,
                                )
                                "RETAKE_AVAILABLE" -> Pill("Qayta topshirish", p.sky)
                                else -> Pill("Kutilmoqda", p.gold)
                            }
                        }
                        if (canStart) PrimaryButton(if (t.status == "PENDING") "Testni boshlash  →" else "Qayta topshirish  →", { openTest(t.testId) }, Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

private fun mmss(sec: Int): String = "%02d:%02d".format(sec / 60, sec % 60)

/** Test topshirish. Vaqt FAQAT serverdan olinadi; mahalliy sanoq faqat ko'rsatish uchun. */
@Composable
fun TestTakingScreen(testId: String, onExit: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var session by remember { mutableStateOf<TestSession?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<SubmitResult?>(null) }
    var remaining by remember { mutableIntStateOf(0) }
    var index by remember { mutableIntStateOf(0) }
    var confirm by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    val selected = remember { mutableStateMapOf<String, List<String>>() }
    val texts = remember { mutableStateMapOf<String, String>() }

    LaunchedEffect(testId) {
        try {
            val s = uz.edugo.mobile.data.AppJson.decodeFromString(TestSession.serializer(), api.raw("POST", "/api/v1/tests/$testId/start", "{}"))
            session = s
            remaining = s.remainingSeconds
            s.savedAnswers.forEach { a ->
                selected[a.questionId] = a.selectedOptionIds
                a.textAnswer?.let { texts[a.questionId] = it }
            }
        } catch (e: ApiException) {
            loadError = e.message
        }
    }

    fun submit() {
        if (submitting || result != null) return
        submitting = true; submitError = null
        scope.launch {
            try {
                val raw = api.raw("POST", "/api/v1/tests/$testId/submit", "{}")
                result = uz.edugo.mobile.data.AppJson.decodeFromString(SubmitResult.serializer(), raw)
            } catch (e: ApiException) {
                submitError = e.message
            }
            submitting = false
        }
    }

    // Mahalliy sanoq + har 20 soniyada serverdan tasdiqlash
    LaunchedEffect(session) {
        if (session == null) return@LaunchedEffect
        var tick = 0
        while (result == null) {
            delay(1000)
            remaining = (remaining - 1).coerceAtLeast(0)
            tick++
            if (tick % 20 == 0) runCatching {
                remaining = api.get("/api/v1/tests/$testId/session", SessionTime.serializer()).remainingSeconds
            }
            if (remaining == 0) { submit(); break }
        }
    }

    fun saveAnswer(qid: String, ids: List<String>, text: String? = null) {
        scope.launch {
            runCatching {
                api.send("POST", "/api/v1/tests/$testId/answer", AnswerBody.serializer(), AnswerBody(qid, ids, text))
            }
        }
    }

    val s = session
    val res = result
    Column(Modifier.fillMaxSize()) {
        when {
            res != null -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                Text(if (res.passed) "🎉" else "📘", fontSize = 56.sp)
                Text(if (res.passed) "Test topshirildi!" else "Test yakunlandi", color = p.ink, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 12.dp))
                Text("${res.score.toInt()} / ${res.maxScore.toInt()} ball · ${res.percent.toInt()}%", color = if (res.passed) p.teal else p.coral, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp, bottom = 6.dp))
                if (res.autoSubmitted) Text("Vaqt tugagani uchun avtomatik yuborildi", color = p.muted, fontSize = 13.sp)
                PrimaryButton("Testlarga qaytish", onExit, Modifier.fillMaxWidth().padding(top = 28.dp))
            }
            loadError != null -> Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                BackHeader("Test", onExit)
                ErrorBox(loadError!!)
            }
            s == null -> Column { BackHeader("Test", onExit); Loading() }
            else -> {
                val q = s.questions.getOrNull(index)
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(s.testTitle, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f), maxLines = 1)
                    Pill(mmss(remaining), if (remaining < 60) p.coral else p.accent)
                }
                AnimatedProgress((index + 1).toFloat() / s.questions.size.coerceAtLeast(1), p.accent, Modifier.padding(horizontal = 16.dp))
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (q != null) {
                        Text("Savol ${index + 1}/${s.questions.size} · ${q.points.toInt()} ball", color = p.muted, fontSize = 12.sp)
                        Text(q.text, color = p.ink, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                        if (q.type == "TEXT_ANSWER") {
                            BasicTextField(
                                value = texts[q.id].orEmpty(),
                                onValueChange = { texts[q.id] = it },
                                textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
                                cursorBrush = SolidColor(p.accent),
                                modifier = Modifier.fillMaxWidth().background(p.surface.copy(alpha = 0.7f), RoundedCornerShape(16.dp)).border(1.dp, p.ink.copy(alpha = 0.12f), RoundedCornerShape(16.dp)).padding(16.dp).height(140.dp),
                            )
                            PrimaryButton("Javobni saqlash", { saveAnswer(q.id, emptyList(), texts[q.id].orEmpty()) }, Modifier.fillMaxWidth())
                        } else {
                            val multi = q.type == "MULTIPLE_CHOICE"
                            if (multi) Text("Bir nechta javobni tanlash mumkin", color = p.faint, fontSize = 12.sp)
                            q.options.forEach { o ->
                                val on = o.id in (selected[q.id] ?: emptyList())
                                Row(
                                    Modifier.fillMaxWidth()
                                        .background(if (on) p.accent.copy(alpha = 0.18f) else p.surface.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                                        .border(1.5.dp, if (on) p.accent else p.ink.copy(alpha = 0.10f), RoundedCornerShape(16.dp))
                                        .pressable {
                                            val cur = selected[q.id] ?: emptyList()
                                            val next = if (multi) (if (on) cur - o.id else cur + o.id) else listOf(o.id)
                                            selected[q.id] = next
                                            saveAnswer(q.id, next)
                                        }
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text(if (on) "●" else "○", color = if (on) p.accent else p.faint, fontSize = 16.sp)
                                    Text(o.text, color = p.ink, fontSize = 15.sp, modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                    submitError?.let { ErrorBox(it) }
                }
                Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (index > 0) Text(
                        "‹ Oldingi", color = p.ink, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.background(p.ink.copy(alpha = 0.08f), CircleShape).pressable { index-- }.padding(horizontal = 18.dp, vertical = 14.dp),
                    )
                    if (index < s.questions.size - 1) PrimaryButton("Keyingi ›", { index++ }, Modifier.weight(1f))
                    else PrimaryButton(if (submitting) "Yuborilmoqda…" else "Yakunlash", { confirm = true }, Modifier.weight(1f), enabled = !submitting)
                }
                if (confirm) {
                    val answered = s.questions.count { (selected[it.id]?.isNotEmpty() == true) || !texts[it.id].isNullOrBlank() }
                    AlertDialog(
                        onDismissRequest = { confirm = false },
                        containerColor = p.surface,
                        title = { Text("Testni yakunlaysizmi?", color = p.ink) },
                        text = { Text("Javob berilgan: $answered/${s.questions.size}. Yakunlagach o'zgartirib bo'lmaydi.", color = p.muted) },
                        confirmButton = { TextButton({ confirm = false; submit() }) { Text("Yakunlash", color = p.accent, fontWeight = FontWeight.Bold) } },
                        dismissButton = { TextButton({ confirm = false }) { Text("Davom etish", color = p.muted) } },
                    )
                }
            }
        }
    }
}
