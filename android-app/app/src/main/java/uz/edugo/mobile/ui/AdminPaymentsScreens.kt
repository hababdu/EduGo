package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import uz.edugo.mobile.data.GroupPaymentsData
import uz.edugo.mobile.data.LeadsData
import uz.edugo.mobile.data.MarkPaymentsBody
import uz.edugo.mobile.data.PaymentMarkRecord
import uz.edugo.mobile.data.PaymentsOverviewData
import uz.edugo.mobile.data.CreateLeadBody
import uz.edugo.mobile.data.UpdateLeadBody
import java.time.YearMonth
import java.time.ZoneId

private fun currentEduGoMonth() = YearMonth.now(ZoneId.of("Asia/Tashkent")).toString()
private fun money(value: Double?) = value?.let { "${"%,.0f".format(it).replace(",", " ")} so'm" } ?: "—"

@Composable
fun AdminPaymentsScreen(openGroup: (String, String) -> Unit) {
    val p = P
    var month by remember { mutableStateOf(currentEduGoMonth()) }
    val remote = rememberRemote("/api/v1/payments/overview?month=$month", PaymentsOverviewData.serializer())
    RefreshColumn(listOf(remote)) {
        Hero("Administrator", "To'lovlar", "Oylik tushum, qarzdorlar va guruhlar kesimida nazorat")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("‹ Oldingi oy", color = p.accent, fontWeight = FontWeight.SemiBold, modifier = Modifier.pressable { month = YearMonth.parse(month).minusMonths(1).toString() }.padding(8.dp))
            Text(month, color = p.ink, fontWeight = FontWeight.Bold, modifier = Modifier.padding(8.dp))
            Text("Keyingi oy ›", color = p.accent, fontWeight = FontWeight.SemiBold, modifier = Modifier.pressable {
                val next = YearMonth.parse(month).plusMonths(1)
                if (next <= YearMonth.parse(currentEduGoMonth())) month = next.toString()
            }.padding(8.dp))
        }
        Section(remote) { data ->
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Text("Yig'ilgan", color = p.muted, fontSize = 12.sp)
                    Text(money(data.totals.collected), color = p.teal, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Kutilgan: ${money(data.totals.expected)}", color = p.ink, fontSize = 13.sp)
                    Text("To'lagan: ${data.totals.paid} · Imtiyoz: ${data.totals.waived} · Qarzdor: ${data.totals.unpaid}", color = p.muted, fontSize = 12.sp)
                }
            }
            SectionTitle("Guruhlar · ${data.groups.size}")
            data.groups.forEachIndexed { index, group ->
                Panel(Modifier.stagger(index).pressable { openGroup(group.groupId, month) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text(group.name, color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text("${group.membersCount} a'zo · ${group.paid} to'lagan · ${group.unpaid} qarzdor", color = p.muted, fontSize = 12.sp)
                        Text("Yig'ilgan: ${money(group.collected)} · Oylik: ${money(group.monthlyFee)}", color = p.teal, fontSize = 12.sp)
                    }
                }
            }
            SectionTitle("Qarzdorlar · ${data.debtors.size}")
            if (data.debtors.isEmpty()) EmptyText("Qarzdorlar yo'q")
            data.debtors.take(30).forEach { debtor ->
                Row(Modifier.fillMaxWidth().pressable { openGroup(debtor.groupId, month) }.padding(vertical = 7.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(debtor.name, color = p.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text(debtor.groupName, color = p.muted, fontSize = 11.sp)
                    }
                    Text(money(debtor.monthlyFee), color = p.coral, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun AdminGroupPaymentsScreen(groupId: String, month: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/payments/group/$groupId?month=$month", GroupPaymentsData.serializer())
    val states = remember(groupId, month) { mutableStateMapOf<String, String>() }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val data = (remote.state as? UiState.Ready)?.value
    LaunchedEffect(data) { data?.students?.forEach { states[it.studentId] = it.status } }
    RefreshColumn(listOf(remote)) {
        BackHeader("Guruh to'lovlari", onBack)
        Section(remote) { d ->
            Hero("To'lov nazorati", d.name, "Oy: $month · Oylik: ${money(d.monthlyFee)}")
            KpiRow(listOf(Triple("To'lagan", d.totals.paid, p.teal), Triple("Qarzdor", d.totals.unpaid, p.coral), Triple("Imtiyoz", d.totals.waived, p.sky)))
            Text("Yig'ilgan: ${money(d.totals.collected)} · Kutilgan: ${money(d.totals.expected)}", color = p.ink, fontWeight = FontWeight.SemiBold)
            d.students.forEachIndexed { index, student ->
                val state = states[student.studentId] ?: student.status
                val name = listOfNotNull(student.firstName, student.lastName).joinToString(" ").ifBlank { student.username ?: "O'quvchi" }
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(name, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(if (!student.due) "Bu oy to'lov yo'q" else stateLabel(state), if (!student.due) p.faint else stateColor(state, p))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("PAID" to "To'ladi", "UNPAID" to "Qarzdor", "WAIVED" to "Imtiyoz").forEach { (key, label) ->
                                val selected = state == key
                                Text(label, color = if (selected) p.base else p.muted, fontSize = 11.sp,
                                    modifier = Modifier.background(if (selected) p.accent else p.raised, RoundedCornerShape(18.dp))
                                        .pressable { if (student.due) states[student.studentId] = key }
                                        .padding(horizontal = 10.dp, vertical = 8.dp))
                            }
                        }
                        if (state == "PAID") Text("Summa: ${money(d.monthlyFee ?: student.amount.takeIf { it > 0 })}", color = p.teal, fontSize = 12.sp)
                    }
                }
            }
            message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
            PrimaryButton(
                if (saving) "Saqlanmoqda…" else "To'lov holatlarini saqlash",
                enabled = !saving && d.students.isNotEmpty() && (d.monthlyFee != null || d.students.none { (states[it.studentId] ?: it.status) == "PAID" && it.amount <= 0 }),
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    saving = true; message = null
                    scope.launch {
                        try {
                            val records = d.students.filter { it.due }.map { student ->
                                val status = states[student.studentId] ?: student.status
                                PaymentMarkRecord(student.studentId, status, if (status == "PAID") (d.monthlyFee ?: student.amount).toInt() else null)
                            }
                            api.send("PUT", "/api/v1/payments/group/$groupId", MarkPaymentsBody.serializer(), MarkPaymentsBody(month, records))
                            remote.reload()
                        } catch (e: Exception) { message = e.message ?: "To'lovlarni saqlab bo'lmadi" }
                        saving = false
                    }
                },
            )
        }
    }
}

private fun stateLabel(v: String) = when (v) { "PAID" -> "To'langan"; "WAIVED" -> "Imtiyoz"; else -> "Qarzdor" }
private fun stateColor(v: String, p: Palette) = when (v) { "PAID" -> p.teal; "WAIVED" -> p.sky; else -> p.coral }
