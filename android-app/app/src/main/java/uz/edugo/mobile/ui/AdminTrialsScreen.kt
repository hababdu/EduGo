package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.AdminTrialItem
import uz.edugo.mobile.data.AdminTrialPage

@Composable
fun AdminTrialsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/admin/trials", AdminTrialPage.serializer())
    val schedules = remember { mutableStateMapOf<String, String>() }
    val busy = remember { mutableStateMapOf<String, Boolean>() }
    var message by remember { androidx.compose.runtime.mutableStateOf<String?>(null) }

    RefreshColumn(listOf(remote)) {
        Hero("EDUGO · QABUL", "Sinov darslari", "Arizalarni ko'rib chiqing va o'quvchilarni maktabga qabul qiling")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        Section(remote) { page ->
            SectionTitle("ARIZALAR · ${page.total}")
            if (page.items.isEmpty()) EmptyText("Sinov darsi arizalari mavjud emas")
            page.items.forEach { item ->
                TrialAdminCard(
                    item = item,
                    schedule = schedules[item.id].orEmpty(),
                    busy = busy[item.id] == true,
                    onSchedule = { schedules[item.id] = it },
                    onAction = { action, body ->
                        busy[item.id] = true
                        message = null
                        scope.launch {
                            try {
                                api.raw("POST", "/api/v1/admin/trials/${item.id}/${action}", body)
                                message = when (action) {
                                    "approve" -> "Sinov darsi tasdiqlandi"
                                    "decline" -> "Ariza rad etildi"
                                    "attended" -> "Qatnashuv saqlandi"
                                    "no-show" -> "Kelmagan deb belgilandi"
                                    "admit" -> "O'quvchi maktabga qabul qilindi"
                                    else -> "Saqlandi"
                                }
                                remote.reload()
                            } catch (e: Exception) {
                                message = e.message ?: "Amal bajarilmadi"
                            } finally { busy[item.id] = false }
                        }
                    },
                )
            }
            if (page.pages > 1) Text("Sahifa ${page.page} / ${page.pages}", color = p.muted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun TrialAdminCard(
    item: AdminTrialItem,
    schedule: String,
    busy: Boolean,
    onSchedule: (String) -> Unit,
    onAction: (String, String) -> Unit,
) {
    val p = P
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(item.student.name.ifBlank { "O'quvchi" }, color = p.ink, fontWeight = FontWeight.Bold)
                    Text(if (item.requestedByParent) "Ota-ona arizasi" else "O'quvchi arizasi", color = p.muted, fontSize = 11.sp)
                }
                Pill(
                    when (item.status) {
                        "REQUESTED" -> "Yangi"
                        "APPROVED" -> "Tasdiqlandi"
                        "ATTENDED" -> "Qatnashdi"
                        "ADMITTED" -> "Qabul qilindi"
                        "DECLINED" -> "Rad etildi"
                        "NO_SHOW" -> "Kelmagan"
                        "CANCELLED" -> "Bekor"
                        else -> item.status
                    },
                    if (item.status == "ADMITTED" || item.status == "ATTENDED") p.teal else p.gold,
                )
            }
            item.group?.let { Text("Guruh: ${it.name}", color = p.muted, fontSize = 11.sp) }
            item.preferredAt?.let { Text("Afzal vaqt: $it", color = p.muted, fontSize = 11.sp) }
            item.scheduledAt?.let { Text("Belgilangan vaqt: $it", color = p.accent, fontSize = 11.sp) }
            item.note?.let { Text("Izoh: $it", color = p.muted, fontSize = 11.sp) }
            item.decisionNote?.let { Text("Admin izohi: $it", color = p.muted, fontSize = 11.sp) }
            when (item.status) {
                "REQUESTED" -> {
                    OutlinedTextField(
                        value = schedule,
                        onValueChange = onSchedule,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Sinov vaqti (ISO 8601)") },
                        placeholder = { Text("2026-11-10T10:00:00+05:00") },
                    )
                    Text("Vaqtni YYYY-MM-DDTHH:mm:ss+05:00 ko'rinishida kiriting", color = p.muted, fontSize = 10.sp)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TextButton(enabled = !busy && schedule.isNotBlank(), onClick = { onAction("approve", """{"scheduledAt":"$schedule"}""") }) { Text("Tasdiqlash") }
                        TextButton(enabled = !busy, onClick = { onAction("decline", "{}") }) { Text("Rad etish", color = p.coral) }
                    }
                }
                "APPROVED" -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(enabled = !busy, onClick = { onAction("attended", "{}") }) { Text("Qatnashdi") }
                    TextButton(enabled = !busy, onClick = { onAction("no-show", "{}") }) { Text("Kelmagan", color = p.coral) }
                }
                "ATTENDED" -> TextButton(enabled = !busy, onClick = { onAction("admit", "{}") }) { Text("Maktabga qabul qilish") }
            }
        }
    }
}
