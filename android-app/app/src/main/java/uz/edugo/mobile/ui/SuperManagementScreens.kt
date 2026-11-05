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
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.MarkOrgPaymentBody
import uz.edugo.mobile.data.SuperAiData
import uz.edugo.mobile.data.SuperAuditData
import uz.edugo.mobile.data.SuperBillingOverview
import uz.edugo.mobile.data.UpdateSuperAiBody
import java.time.YearMonth
import java.time.ZoneId

private fun superMoney(v: Long?) = v?.let { "${"%,.0f".format(it).replace(",", " ")} so'm" } ?: "—"

@Composable
fun SuperBillingScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var month by remember { mutableStateOf(YearMonth.now(ZoneId.of("Asia/Tashkent")).toString()) }
    val remote = rememberRemote("/api/v1/super/billing?month=$month", SuperBillingOverview.serializer())
    var amounts by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var notes by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val data = (remote.state as? UiState.Ready)?.value
    RefreshColumn(listOf(remote)) {
        Hero("Super administrator", "Maktab obunalari", "Maktablar EduGo platformasi uchun oylik to'lov qiladi")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("‹ Oldingi", color = p.accent, modifier = Modifier.pressable { month = YearMonth.parse(month).minusMonths(1).toString() }.padding(8.dp))
            Text(month, color = p.ink, fontWeight = FontWeight.Bold, modifier = Modifier.padding(8.dp))
            Text("Keyingi ›", color = p.accent, modifier = Modifier.pressable {
                val next = YearMonth.parse(month).plusMonths(1)
                if (next <= YearMonth.now(ZoneId.of("Asia/Tashkent"))) month = next.toString()
            }.padding(8.dp))
        }
        Section(remote) { d ->
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("Yig'ilgan: ${superMoney(d.totals.collected)}", color = p.teal, fontWeight = FontWeight.Bold, fontSize = 19.sp)
                    Text("Kutilgan: ${superMoney(d.totals.expected)}", color = p.ink, fontSize = 13.sp)
                    Text("To'lagan: ${d.totals.paid} · Imtiyoz: ${d.totals.waived} · Qarzdor: ${d.totals.unpaid}", color = p.muted, fontSize = 12.sp)
                }
            }
            d.items.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.name, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(if (item.orgStatus == "SUSPENDED") "To'xtatilgan" else item.state, if (item.state == "PAID") p.teal else if (item.state == "WAIVED") p.sky else p.coral)
                        }
                        Text("Reja: ${superMoney(item.fee)} · To'langan: ${superMoney(item.amount)}", color = p.muted, fontSize = 12.sp)
                        BasicTextField(amounts[item.orgId] ?: item.amount.takeIf { it > 0 }?.toString().orEmpty(),
                            { amounts = amounts + (item.orgId to it.filter(Char::isDigit).take(12)) }, singleLine = true,
                            textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                            modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(11.dp),
                            decorationBox = { inner -> if ((amounts[item.orgId] ?: "").isEmpty()) Text("To'lov summasi (so'm)", color = p.faint, fontSize = 12.sp); inner() },
                        )
                        BasicTextField(notes[item.orgId] ?: item.note.orEmpty(),
                            { notes = notes + (item.orgId to it) }, singleLine = true,
                            textStyle = TextStyle(color = p.ink, fontSize = 12.sp), cursorBrush = SolidColor(p.accent),
                            modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(11.dp),
                            decorationBox = { inner -> if ((notes[item.orgId] ?: "").isEmpty()) Text("Izoh (ixtiyoriy)", color = p.faint, fontSize = 12.sp); inner() },
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("PAID" to "To'ladi", "WAIVED" to "Imtiyoz", "UNPAID" to "Bekor").forEach { (status, label) ->
                                Text(label, color = p.accent, fontSize = 11.sp,
                                    modifier = Modifier.pressable {
                                        if (busyId == null) {
                                            busyId = item.orgId; message = null
                                            scope.launch {
                                                runCatching {
                                                    val amount = (amounts[item.orgId] ?: item.fee?.toString().orEmpty()).toLongOrNull()
                                                    if (status == "PAID" && (amount == null || amount <= 0)) error("To'lov summasini kiriting")
                                                    api.send("PUT", "/api/v1/super/billing/${item.orgId}", MarkOrgPaymentBody.serializer(),
                                                        MarkOrgPaymentBody(month, status, if (status == "PAID") amount else null, notes[item.orgId]))
                                                    remote.reload()
                                                }.onFailure { message = it.message ?: "Saqlanmadi" }
                                                busyId = null
                                            }
                                        }
                                    }.padding(horizontal = 8.dp, vertical = 7.dp))
                            }
                        }
                        if (busyId == item.orgId) Text("Saqlanmoqda…", color = p.faint, fontSize = 10.sp)
                    }
                }
            }
            message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
        }
    }
}

@Composable
fun SuperAuditScreen() {
    val p = P
    var page by remember { mutableStateOf(1) }
    var action by remember { mutableStateOf("") }
    val remote = rememberRemote("/api/v1/super/audit?page=$page${if (action.isNotBlank()) "&action=$action" else ""}", SuperAuditData.serializer())
    RefreshColumn(listOf(remote)) {
        Hero("Super administrator", "Audit jurnali", "Kim, qachon va qaysi ma'lumotni o'zgartirgan")
        val data = (remote.state as? UiState.Ready)?.value
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Barchasi", color = if (action.isBlank()) p.base else p.muted, modifier = Modifier.background(if (action.isBlank()) p.accent else p.raised, RoundedCornerShape(18.dp)).pressable { action = ""; page = 1 }.padding(9.dp), fontSize = 11.sp)
            data?.actions?.forEach { item ->
                Text(item, color = if (action == item) p.base else p.muted, modifier = Modifier.background(if (action == item) p.accent else p.raised, RoundedCornerShape(18.dp)).pressable { action = item; page = 1 }.padding(9.dp), fontSize = 11.sp)
            }
        }
        Section(remote) { d ->
            SectionTitle("Yozuvlar: ${d.total} · ${d.items.size}")
            if (d.items.isEmpty()) EmptyText("Audit yozuvlari yo'q")
            d.items.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Pill(item.action, p.gold)
                            Text(fmtDue(item.createdAt), color = p.faint, fontSize = 10.sp)
                        }
                        Text("${item.actor.name} · ${item.actor.role}", color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        Text("${item.targetType} · ${item.targetId.take(12)}", color = p.muted, fontSize = 11.sp)
                        item.oldValue?.let { Text("Oldin: ${it.toString().take(180)}", color = p.faint, fontSize = 10.sp) }
                        item.newValue?.let { Text("Keyin: ${it.toString().take(180)}", color = p.muted, fontSize = 10.sp) }
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("← Oldingi", color = if (page > 1) p.accent else p.faint, modifier = Modifier.pressable { if (page > 1) page-- }.padding(8.dp))
                Text("${d.page} / ${d.pages}", color = p.muted, modifier = Modifier.padding(8.dp))
                Text("Keyingi →", color = if (page < d.pages) p.accent else p.faint, modifier = Modifier.pressable { if (page < d.pages) page++ }.padding(8.dp))
            }
        }
    }
}

@Composable
fun SuperAiSettingsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/super/ai", SuperAiData.serializer())
    var enabled by remember { mutableStateOf(true) }
    var primary by remember { mutableStateOf("gemini") }
    var fallback by remember { mutableStateOf("none") }
    var limits by remember { mutableStateOf(mapOf("STUDENT" to "0", "TEACHER" to "0", "ADMIN" to "0")) }
    var saving by remember { mutableStateOf(false) }
    var initialized by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val data = (remote.state as? UiState.Ready)?.value
    LaunchedEffect(data) {
        if (data != null && !initialized) {
            enabled = data.settings.enabled
            primary = data.settings.primary
            fallback = data.settings.fallback ?: "none"
            limits = listOf("STUDENT", "TEACHER", "ADMIN").associateWith { data.settings.limits[it]?.toString() ?: "0" }
            initialized = true
        }
    }
    RefreshColumn(listOf(remote)) {
        Hero("Super administrator", "AI sozlamalari", "Provayder, zaxira AI va rollar bo'yicha limitlar")
        Section(remote) { d ->
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("AI xizmati", color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text(if (enabled) "Yoqilgan" else "O'chirilgan", color = if (enabled) p.teal else p.coral,
                            modifier = Modifier.pressable { enabled = !enabled })
                    }
                    SectionTitle("Asosiy provayder")
                    listOf("gemini" to "Gemini", "groq" to "Groq", "anthropic" to "Claude").forEach { (id, label) ->
                        val selected = primary == id
                        Text("${if (selected) "●" else "○"} $label · ${if (d.provider.configured[id] == true) "API kalit bor" else "API kalit yo'q"}",
                            color = if (selected) p.accent else p.ink, fontSize = 13.sp,
                            modifier = Modifier.pressable { primary = id; if (fallback == id) fallback = "none" }.padding(vertical = 4.dp))
                    }
                    SectionTitle("Zaxira provayder")
                    listOf("none" to "Zaxira yo'q", "gemini" to "Gemini", "groq" to "Groq", "anthropic" to "Claude").filter { it.first != primary || it.first == "none" }.forEach { (id, label) ->
                        Text("${if (fallback == id) "●" else "○"} $label", color = if (fallback == id) p.accent else p.ink, fontSize = 12.sp,
                            modifier = Modifier.pressable { fallback = id }.padding(vertical = 4.dp))
                    }
                    SectionTitle("Kunlik token limiti")
                    limits.forEach { (role, value) ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(role, color = p.muted, fontSize = 12.sp)
                            BasicTextField(value, { v -> limits = limits + (role to v.filter(Char::isDigit).take(8)) }, singleLine = true,
                                textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                                modifier = Modifier.background(p.raised, RoundedCornerShape(8.dp)).padding(8.dp))
                        }
                    }
                    Text("0 — cheklanmagan. API kalitlar server muhit o'zgaruvchilarida saqlanadi.", color = p.faint, fontSize = 10.sp)
                    PrimaryButton(if (saving) "Saqlanmoqda…" else "AI sozlamalarini saqlash", enabled = !saving && limits.values.all { it.toIntOrNull() != null }, modifier = Modifier.fillMaxWidth(), onClick = {
                        saving = true; message = null
                        scope.launch {
                            try {
                                val body = UpdateSuperAiBody(enabled, limits.mapValues { it.value.toInt() }, primary, fallback)
                                api.send("PUT", "/api/v1/super/ai", UpdateSuperAiBody.serializer(), body)
                                remote.reload(); message = "AI sozlamalari saqlandi"
                            } catch (e: Exception) { message = e.message ?: "Sozlamalar saqlanmadi" }
                            saving = false
                        }
                    })
                    message?.let { Text(it, color = if (it.startsWith("AI sozlamalari")) p.teal else p.coral, fontSize = 12.sp) }
                }
            }
            SectionTitle("Provayder holati")
            Text("Asosiy: ${d.provider.primary} · Faol: ${d.provider.active.joinToString()}", color = p.muted, fontSize = 12.sp)
            SectionTitle("So'nggi 7 kun")
            d.days.forEach { Text("${it.date}: ${it.tokens} token", color = p.muted, fontSize = 11.sp) }
            SectionTitle("Funksiyalar")
            d.features.forEach { Text("${it.feature}: ${it.requests} so'rov · ${it.tokens} token", color = p.muted, fontSize = 11.sp) }
        }
    }
}
