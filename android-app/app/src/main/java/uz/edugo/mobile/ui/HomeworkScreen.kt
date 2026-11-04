package uz.edugo.mobile.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.HwBody
import uz.edugo.mobile.data.HwMine
import uz.edugo.mobile.data.MaterialFileDto

@Composable
fun HomeworkScreen(assignmentId: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val r = rememberRemote("/api/v1/submissions/assignments/$assignmentId/mine", HwMine.serializer())
    var text by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf<String?>(null) }
    var files by remember { mutableStateOf<List<MaterialFileDto>>(emptyList()) }
    var uploading by remember { mutableStateOf(false) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) scope.launch {
            uploading = true
            info = null
            try {
                if (files.size >= 5) throw IllegalStateException("Ko'pi bilan 5 ta fayl biriktirish mumkin")
                val file = api.uploadMaterial(context, uri)
                files = files + file
                info = "Fayl biriktirildi: ${file.fileName}"
            } catch (e: Exception) { info = e.message ?: "Fayl yuklanmadi" }
            uploading = false
        }
    }
    val ready = (r.state as? UiState.Ready)?.value

    LaunchedEffect(ready?.submission?.submittedAt) {
        ready?.submission?.textAnswer?.let { text = it }
        files = ready?.submission?.files.orEmpty()
    }
    // AI baholash ketayotgan bo'lsa natijani kutamiz
    LaunchedEffect(ready?.assignment?.gradingStatus) {
        while (ready?.assignment?.gradingStatus == "RUNNING") { delay(8000); r.reload() }
    }

    Column {
        BackHeader("Uy vazifasi", onBack)
        RefreshColumn(listOf(r)) {
            Section(r) { m ->
                val sub = m.submission
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(m.assignment.dueAt?.let { "Muddat: ${fmtDue(it)}" } ?: "Muddat belgilanmagan", color = p.muted, fontSize = 13.sp)
                        Text("Maksimal ball: ${m.assignment.maxScore}", color = p.muted, fontSize = 13.sp)
                        if (!m.canSubmit) m.closedReason?.let { Text(it, color = p.coral, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                    }
                }
                if (sub != null) {
                    Panel {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            when (sub.status) {
                                "GRADED" -> Pill("Baholandi: ${sub.score?.toInt() ?: "—"}/${sub.maxScore}", p.teal)
                                "RETURNED" -> Pill("Tuzatishga qaytarildi", p.coral)
                                else -> Pill("Topshirildi", p.sky)
                            }
                            if (m.assignment.gradingStatus == "RUNNING") Text("AI tekshirmoqda…", color = p.gold, fontSize = 13.sp)
                            sub.returnNote?.takeIf { it.isNotBlank() }?.let { Text("O'qituvchi izohi: $it", color = p.coral, fontSize = 13.sp) }
                            sub.files.forEach { file -> Text("📎 ${file.fileName} · ${file.sizeBytes / 1024} KB", color = p.muted, fontSize = 12.sp) }
                            sub.feedback?.takeIf { it.isNotBlank() }?.let { Text(it, color = p.ink, fontSize = 14.sp) }
                            sub.strengths.forEach { Text("✓ $it", color = p.teal, fontSize = 13.sp) }
                            sub.improvements.forEach { Text("• $it", color = p.gold, fontSize = 13.sp) }
                            sub.gradedBy?.let { Text(if (it == "AI") "AI baholadi" else "O'qituvchi baholadi", color = p.faint, fontSize = 11.sp) }
                        }
                    }
                }
                val returned = sub?.status == "RETURNED"
                if (m.canSubmit && (sub == null || editing || returned)) {
                    BasicTextField(
                        value = text, onValueChange = { text = it },
                        textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
                        cursorBrush = SolidColor(p.accent),
                        modifier = Modifier.fillMaxWidth().height(180.dp)
                            .background(p.surface.copy(alpha = 0.7f), RoundedCornerShape(16.dp))
                            .border(1.dp, p.ink.copy(alpha = 0.12f), RoundedCornerShape(16.dp)).padding(16.dp),
                        decorationBox = { inner -> if (text.isEmpty()) Text("Javobingizni yozing…", color = p.faint, fontSize = 15.sp); inner() },
                    )
                    if (files.isNotEmpty()) {
                        files.forEach { file ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("📎 ${file.fileName}", color = p.ink, fontSize = 12.sp, modifier = Modifier.weight(1f))
                                Text("Olib tashlash", color = p.coral, fontSize = 11.sp, modifier = Modifier.pressable { files = files.filterNot { it.id == file.id } })
                            }
                        }
                    }
                    PrimaryButton(if (uploading) "Fayl yuklanmoqda…" else "Fayl biriktirish", enabled = !uploading && files.size < 5, modifier = Modifier.fillMaxWidth(), onClick = { picker.launch(arrayOf("*/*")) })
                    PrimaryButton(
                        if (busy) "Yuborilmoqda…" else "Topshirish", enabled = !busy && !uploading && (text.isNotBlank() || files.isNotEmpty()), modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            busy = true; info = null
                            scope.launch {
                                info = try {
                                    api.send("PUT", "/api/v1/submissions/assignments/$assignmentId/mine", HwBody.serializer(), HwBody(text.trim().ifBlank { null }, files.map { it.id }))
                                    editing = false; r.reload(); "Vazifa topshirildi ✓"
                                } catch (e: ApiException) { e.message ?: "Topshirib bo'lmadi" }
                                busy = false
                            }
                        },
                    )
                    Text("Matn, PDF, rasm va boshqa fayllarni birga yuborishingiz mumkin", color = p.faint, fontSize = 11.sp)
                } else if (m.canSubmit && sub != null) {
                    Text("Javobni o'zgartirish", color = p.accent, fontWeight = FontWeight.Bold, modifier = Modifier.pressable { editing = true }.padding(8.dp))
                }
                info?.let { Text(it, color = if (it.contains("✓")) p.teal else p.coral, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
            }
        }
    }
}
