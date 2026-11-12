package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import uz.edugo.mobile.data.AssignmentRow
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.MemberPage
import uz.edugo.mobile.data.SubjectRow

private val DAY_SHORT = listOf("Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya")

@Composable
private fun Choice(label: String, on: Boolean, onClick: () -> Unit) {
    val p = P
    Text(
        label, color = if (on) p.accent else p.faint, fontSize = 12.sp,
        fontWeight = if (on) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) p.accent.copy(alpha = 0.16f) else p.surface)
            .pressable(onClick).padding(horizontal = 12.dp, vertical = 7.dp),
    )
}

/** Fanlar, o'qituvchi tayinlash (fan + guruh) va tayinlash uchun dars (jadval) qo'shish. */
@Composable
fun AdminTeachingScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val subjects = rememberRemoteList("/api/v1/admin/teaching/subjects", SubjectRow.serializer())
    val assigns = rememberRemoteList("/api/v1/admin/teaching/assignments", AssignmentRow.serializer())
    val groups = rememberRemoteList("/api/v1/groups", GroupItem.serializer())
    val teachers = rememberRemote("/api/v1/admin/memberships?status=ACTIVE&role=TEACHER", MemberPage.serializer())
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var newSubject by remember { mutableStateOf("") }
    var teacherId by remember { mutableStateOf("") }
    var subjectId by remember { mutableStateOf("") }
    var groupId by remember { mutableStateOf("") }
    var slotFor by remember { mutableStateOf<String?>(null) }
    var weekday by remember { mutableStateOf(1) }
    var start by remember { mutableStateOf("09:00") }
    var end by remember { mutableStateOf("10:00") }
    var room by remember { mutableStateOf("") }

    fun run(method: String, path: String, body: String?, ok: String, after: () -> Unit = {}) {
        busy = true; message = null
        scope.launch {
            try {
                api.raw(method, path, body)
                message = ok; after()
                subjects.reload(); assigns.reload()
            } catch (e: Exception) { message = e.message ?: "Amal bajarilmadi" } finally { busy = false }
        }
    }

    RefreshColumn(listOf(subjects, assigns, groups, teachers)) {
        Hero("EDUGO · O'QITISH", "Fan va tayinlash", "O'qituvchini fan va guruhga biriktiring, dars vaqtini belgilang")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }

        SectionTitle("FANLAR")
        Section(subjects) { list ->
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (list.isEmpty()) Text("Fan yo'q — avval fan qo'shing", color = p.muted, fontSize = 12.sp)
                    list.forEach { s ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(s.name, color = p.ink)
                            TextButton(enabled = !busy, onClick = { run("DELETE", "/api/v1/admin/teaching/subjects/${s.id}", null, "Fan o'chirildi") }) { Text("O'chirish", color = p.coral) }
                        }
                    }
                    OutlinedTextField(value = newSubject, onValueChange = { newSubject = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Yangi fan nomi") })
                    TextButton(enabled = !busy && newSubject.isNotBlank(), onClick = {
                        run("POST", "/api/v1/admin/teaching/subjects", """{"name":${jsonStr(newSubject.trim())}}""", "Fan qo'shildi") { newSubject = "" }
                    }) { Text("Qo'shish") }
                }
            }
        }

        SectionTitle("YANGI TAYINLASH")
        Panel {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("O'qituvchi", color = p.muted, fontSize = 11.sp)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (teachers.state as? UiState.Ready)?.value?.items.orEmpty().forEach { t -> Choice(t.user.name, teacherId == t.user.id) { teacherId = t.user.id } }
                }
                Text("Fan", color = p.muted, fontSize = 11.sp)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (subjects.state as? UiState.Ready)?.value.orEmpty().forEach { s -> Choice(s.name, subjectId == s.id) { subjectId = s.id } }
                }
                Text("Guruh", color = p.muted, fontSize = 11.sp)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    (groups.state as? UiState.Ready)?.value.orEmpty().forEach { g -> Choice(g.name, groupId == g.id) { groupId = g.id } }
                }
                TextButton(enabled = !busy && teacherId.isNotBlank() && subjectId.isNotBlank() && groupId.isNotBlank(), onClick = {
                    run("POST", "/api/v1/admin/teaching/assignments", """{"teacherId":"$teacherId","subjectId":"$subjectId","groupId":"$groupId"}""", "Tayinlandi")
                }) { Text("Tayinlash") }
            }
        }

        SectionTitle("TAYINLASHLAR")
        Section(assigns) { list ->
            if (list.isEmpty()) EmptyText("Tayinlash yo'q")
            list.forEach { a ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("${a.subject.name} · ${a.group.name}", color = p.ink, fontWeight = FontWeight.Bold)
                        Text("${a.teacher.name} · ${a.slots} ta dars", color = p.muted, fontSize = 11.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            TextButton(enabled = !busy, onClick = { slotFor = if (slotFor == a.id) null else a.id }) { Text("Dars qo'shish") }
                            TextButton(enabled = !busy, onClick = { run("DELETE", "/api/v1/admin/teaching/assignments/${a.id}", null, "Tayinlash o'chirildi") }) { Text("O'chirish", color = p.coral) }
                        }
                        if (slotFor == a.id) {
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                DAY_SHORT.forEachIndexed { i, d -> Choice(d, weekday == i + 1) { weekday = i + 1 } }
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(value = start, onValueChange = { start = it }, singleLine = true, modifier = Modifier.weight(1f), label = { Text("Boshlanish") })
                                OutlinedTextField(value = end, onValueChange = { end = it }, singleLine = true, modifier = Modifier.weight(1f), label = { Text("Tugash") })
                            }
                            OutlinedTextField(value = room, onValueChange = { room = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Xona (ixtiyoriy)") })
                            TextButton(enabled = !busy && Regex("""\d{2}:\d{2}""").matches(start) && Regex("""\d{2}:\d{2}""").matches(end), onClick = {
                                val roomPart = if (room.isNotBlank()) ""","room":${jsonStr(room.trim())}""" else ""
                                run("POST", "/api/v1/admin/teaching/assignments/${a.id}/slots", """{"weekday":$weekday,"startTime":"$start","endTime":"$end"$roomPart}""", "Dars qo'shildi") { slotFor = null }
                            }) { Text("Saqlash (HH:mm)") }
                        }
                    }
                }
            }
        }
    }
}

private fun jsonStr(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
