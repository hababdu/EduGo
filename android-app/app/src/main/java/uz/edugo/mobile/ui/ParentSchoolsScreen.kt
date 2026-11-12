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
import uz.edugo.mobile.data.Child
import uz.edugo.mobile.data.ParentTrial
import uz.edugo.mobile.data.SchoolCatalog

private fun trialUz(s: String) = when (s) {
    "REQUESTED" -> "Ariza yuborildi · tasdiq kutilmoqda"
    "APPROVED" -> "Sinov darsi tasdiqlandi"
    "ATTENDED" -> "Sinov darsida qatnashdi"
    "ADMITTED" -> "Maktabga qabul qilindi"
    "DECLINED" -> "Ariza rad etildi"
    "NO_SHOW" -> "Sinov darsiga kelmadi"
    "CANCELLED" -> "Ariza bekor qilindi"
    else -> s
}

/** Ota-ona: maktablar katalogi va farzand uchun sinov darsiga yozish. */
@Composable
fun ParentSchoolsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var search by remember { mutableStateOf("") }
    var childId by remember { mutableStateOf("") }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val children = rememberRemoteList("/api/v1/parent/children", Child.serializer())
    val catalog = rememberRemote("/api/v1/catalog?sort=rating&search=${java.net.URLEncoder.encode(search, "UTF-8")}", SchoolCatalog.serializer())
    val trials = rememberRemoteList("/api/v1/trials/mine", ParentTrial.serializer())
    val kids = (children.state as? UiState.Ready)?.value.orEmpty()
    val selected = childId.ifBlank { kids.firstOrNull()?.id.orEmpty() }

    RefreshColumn(listOf(children, catalog, trials)) {
        Hero("EDUGO MAKTABLARI", "Maktab tanlash", "Farzandingiz uchun sinov darsiga yoziling")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        if (kids.isEmpty()) EmptyText("Avval farzandni bog'lang")
        if (kids.size > 1) {
            Text("Farzand", color = p.muted, fontSize = 11.sp)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                kids.forEach { k ->
                    val on = k.id == selected
                    Text(k.name, color = if (on) p.accent else p.faint, fontSize = 12.sp, fontWeight = if (on) FontWeight.Bold else FontWeight.Medium,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) p.accent.copy(alpha = 0.16f) else p.surface)
                            .pressable { childId = k.id }.padding(horizontal = 12.dp, vertical = 7.dp))
                }
            }
        }
        OutlinedTextField(value = search, onValueChange = { search = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(16.dp), label = { Text("Maktab qidirish") })

        Section(trials) { rows ->
            SectionTitle("ARIZALAR · ${rows.size}")
            if (rows.isEmpty()) EmptyText("Hali ariza yo'q")
            rows.forEach { t ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text("${t.student.name} → ${t.organization.name}", color = p.ink, fontWeight = FontWeight.Bold)
                        Text(trialUz(t.status), color = p.muted, fontSize = 12.sp)
                        t.scheduledAt?.let { Text("Dars vaqti: $it", color = p.accent, fontSize = 11.sp) }
                        t.decisionNote?.let { Text(it, color = p.muted, fontSize = 11.sp) }
                        if (t.status == "REQUESTED" || t.status == "APPROVED") {
                            TextButton(enabled = busyId != t.id, onClick = {
                                busyId = t.id
                                scope.launch {
                                    try { api.raw("DELETE", "/api/v1/trials/${t.id}"); message = "Ariza bekor qilindi"; trials.reload() }
                                    catch (e: Exception) { message = e.message ?: "Bekor qilinmadi" } finally { busyId = null }
                                }
                            }) { Text("Bekor qilish", color = p.coral) }
                        }
                    }
                }
            }
        }
        Section(catalog) { data ->
            SectionTitle("KATALOG · ${data.total}")
            if (data.items.isEmpty()) EmptyText("Maktab topilmadi")
            data.items.forEach { school ->
                val open = (trials.state as? UiState.Ready)?.value?.any { it.organization.id == school.id && it.student.id == selected && it.status in listOf("REQUESTED", "APPROVED", "ATTENDED", "ADMITTED") } == true
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(school.name, color = p.ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(if (school.ratingAvg > 0) "★ ${school.ratingAvg}" else "—", color = p.gold, fontSize = 12.sp)
                        }
                        Text(school.city.orEmpty(), color = p.muted, fontSize = 11.sp)
                        school.about?.takeIf { it.isNotBlank() }?.let { Text(it, color = p.muted, fontSize = 11.sp, maxLines = 3) }
                        if (open) Pill("Ariza bor", p.teal)
                        else TextButton(enabled = selected.isNotBlank() && busyId != school.id, onClick = {
                            busyId = school.id; message = null
                            scope.launch {
                                try {
                                    api.raw("POST", "/api/v1/trials", """{"organizationId":"${school.id}","studentId":"$selected"}""")
                                    message = "${school.name}: sinov darsi arizasi yuborildi"; trials.reload()
                                } catch (e: Exception) { message = e.message ?: "Ariza yuborilmadi" } finally { busyId = null }
                            }
                        }) { Text(if (busyId == school.id) "Yuborilmoqda…" else "Sinov darsiga yozish") }
                    }
                }
            }
        }
    }
}
