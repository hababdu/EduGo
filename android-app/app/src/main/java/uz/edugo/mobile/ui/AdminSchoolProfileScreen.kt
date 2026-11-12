package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.OrgInvoiceRow

private fun q(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

/** Maktabning katalogdagi profili va obuna hisoblari. */
@Composable
fun AdminSchoolProfileScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val invoices = rememberRemoteList("/api/v1/admin/subscription/invoices", OrgInvoiceRow.serializer())
    var city by remember { mutableStateOf("") }
    var about by remember { mutableStateOf("") }
    var isPublic by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    RefreshColumn(listOf(invoices)) {
        Hero("EDUGO · MAKTAB", "Profil va obuna", "Katalogdagi ma'lumotlar va to'lov hisoblari")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        Panel {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = city, onValueChange = { if (it.length <= 60) city = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Shahar") })
                OutlinedTextField(value = about, onValueChange = { if (it.length <= 1000) about = it }, minLines = 3, modifier = Modifier.fillMaxWidth(), label = { Text("Maktab haqida") })
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Katalogda ko'rinsin", color = p.ink, fontSize = 13.sp)
                    Switch(checked = isPublic, onCheckedChange = { isPublic = it })
                }
                TextButton(enabled = !busy, onClick = {
                    busy = true; message = null
                    scope.launch {
                        try {
                            api.raw("PATCH", "/api/v1/admin/school-profile", """{"city":${q(city.trim())},"about":${q(about.trim())},"isPublic":$isPublic}""")
                            message = "Saqlandi"
                        } catch (e: Exception) { message = e.message ?: "Saqlanmadi" } finally { busy = false }
                    }
                }) { Text("Saqlash") }
                Text("Shaharni o'chirish uchun maydonni bo'sh qoldirib saqlang.", color = p.muted, fontSize = 10.sp)
            }
        }
        SectionTitle("OBUNA HISOBLARI")
        Section(invoices) { list ->
            if (list.isEmpty()) EmptyText("Hisob yo'q")
            list.forEach { i ->
                Panel {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(i.month, color = p.ink, fontWeight = FontWeight.Bold)
                            Text("%,d so'm".format(i.amount).replace(',', ' '), color = p.muted, fontSize = 11.sp)
                        }
                        Pill(
                            when (i.status) { "PAID" -> "To'langan"; "PENDING" -> "Kutilmoqda"; else -> "Bekor" },
                            if (i.status == "PAID") p.teal else p.gold,
                        )
                    }
                }
            }
        }
    }
}
