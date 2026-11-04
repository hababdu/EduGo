package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import uz.edugo.mobile.data.CreateLeadBody
import uz.edugo.mobile.data.LeadItem
import uz.edugo.mobile.data.LeadsData
import uz.edugo.mobile.data.UpdateLeadBody

private val leadStatuses = listOf("NEW" to "Yangi", "CONTACTED" to "Aloqa qilindi", "TRIAL" to "Sinov darsi", "ENROLLED" to "Qabul qilindi", "LOST" to "Rad etildi")

@Composable
fun AdminLeadsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var filter by remember { mutableStateOf("ALL") }
    val path = if (filter == "ALL") "/api/v1/leads" else "/api/v1/leads?status=$filter"
    val remote = rememberRemote(path, LeadsData.serializer())
    var adding by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var source by remember { mutableStateOf("") }
    var interest by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf<LeadItem?>(null) }
    RefreshColumn(listOf(remote)) {
        Hero("Administrator", "Qabul / arizalar", "Yangi murojaatlar, aloqa va sinov darslari")
        val counts = (remote.state as? UiState.Ready)?.value?.counts
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("ALL" to "Barchasi", *leadStatuses.toTypedArray()).forEach { (key, label) ->
                val selected = filter == key
                Text(label, color = if (selected) p.base else p.muted, fontSize = 10.sp,
                    modifier = Modifier.background(if (selected) p.accent else p.raised, RoundedCornerShape(20.dp))
                        .pressable { filter = key }.padding(horizontal = 9.dp, vertical = 8.dp))
            }
        }
        if (counts != null) Text("Yangi ${counts.NEW} · Aloqada ${counts.CONTACTED} · Sinov ${counts.TRIAL} · Qabul ${counts.ENROLLED}", color = p.muted, fontSize = 11.sp)
        PrimaryButton(if (adding) "Formani yopish" else "+ Ariza qo'shish", modifier = Modifier.fillMaxWidth(), onClick = { adding = !adding; message = null })
        if (adding) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Yangi ariza")
                    LeadField(name, { name = it }, "Ism-familiya *")
                    LeadField(phone, { phone = it }, "Telefon")
                    LeadField(source, { source = it }, "Manba (Instagram, tanish...)")
                    LeadField(interest, { interest = it }, "Qiziqish / kurs")
                    LeadField(note, { note = it }, "Izoh")
                    message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
                    PrimaryButton(if (busy) "Saqlanmoqda…" else "Saqlash", enabled = !busy && name.trim().length >= 2, modifier = Modifier.fillMaxWidth(), onClick = {
                        busy = true
                        scope.launch {
                            try {
                                api.send("POST", "/api/v1/leads", CreateLeadBody.serializer(), CreateLeadBody(name.trim(), phone.trim().ifBlank { null }, source.trim().ifBlank { null }, interest.trim().ifBlank { null }, note.trim().ifBlank { null }))
                                name = ""; phone = ""; source = ""; interest = ""; note = ""; adding = false; remote.reload()
                            } catch (e: Exception) { message = e.message ?: "Ariza saqlanmadi" }
                            busy = false
                        }
                    })
                }
            }
        }
        Section(remote) { data ->
            SectionTitle("Arizalar · ${data.items.size}")
            if (data.items.isEmpty()) EmptyText("Arizalar topilmadi")
            data.items.forEachIndexed { index, lead ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(lead.name, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(leadStatuses.firstOrNull { it.first == lead.status }?.second ?: lead.status, if (lead.status == "ENROLLED") p.teal else if (lead.status == "LOST") p.coral else p.gold)
                        }
                        Text(listOfNotNull(lead.phone, lead.interest, lead.source).joinToString(" · "), color = p.muted, fontSize = 11.sp)
                        lead.note?.let { Text(it, color = p.faint, fontSize = 12.sp) }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            leadStatuses.forEach { (key, label) ->
                                if (lead.status != key) Text(label, color = p.accent, fontSize = 10.sp,
                                    modifier = Modifier.pressable {
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/leads/${lead.id}", UpdateLeadBody.serializer(), UpdateLeadBody(status = key))
                                                remote.reload()
                                            }.onFailure { message = it.message ?: "Holat yangilanmadi" }
                                        }
                                    }.padding(vertical = 5.dp))
                            }
                        }
                        Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                            Text("O'chirish", color = p.coral, fontSize = 11.sp, modifier = Modifier.pressable { deleting = lead }.padding(6.dp))
                        }
                    }
                }
            }
        }
    }
    deleting?.let { lead ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Arizani o'chirish?") },
            text = { Text("${lead.name} arizasini o'chirishni tasdiqlang.") },
            confirmButton = { TextButton(onClick = {
                deleting = null
                scope.launch {
                    runCatching { api.raw("DELETE", "/api/v1/leads/${lead.id}"); remote.reload() }
                        .onFailure { message = it.message ?: "O'chirilmadi" }
                }
            }) { Text("O'chirish") } },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Bekor qilish") } },
        )
    }
}

@Composable
private fun LeadField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    val p = P
    BasicTextField(value = value, onValueChange = onValueChange,
        textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
        modifier = Modifier.fillMaxWidth().background(p.raised.copy(alpha = 0.5f), RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 11.dp),
        decorationBox = { inner -> if (value.isEmpty()) Text(placeholder, color = p.faint, fontSize = 12.sp); inner() },
    )
}
