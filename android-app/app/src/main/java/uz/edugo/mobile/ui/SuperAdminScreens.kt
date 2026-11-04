package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.SuperOrganization
import uz.edugo.mobile.data.SuperOrgDetail
import uz.edugo.mobile.data.SuperOverview

@Composable
fun SuperAdminHome(openOrganizations: () -> Unit) {
    val p = P
    val remote = rememberRemote("/api/v1/super/overview", SuperOverview.serializer())
    RefreshColumn(listOf(remote)) {
        Hero("Super admin", "Platforma boshqaruvi", "Barcha tashkilotlar va tizim holati")
        Section(remote) { data ->
            KpiRow(listOf(
                Triple("Maktablar", data.organizations.active, p.accent),
                Triple("Foydalanuvchi", data.users.total, p.sky),
                Triple("Faol 7 kun", data.users.active7d, p.teal),
            ))
            KpiRow(listOf(
                Triple("Guruhlar", data.groups, p.gold),
                Triple("Testlar", data.tests, p.accent2),
                Triple("Fayllar", data.files.count, p.coral),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SectionTitle("Bugungi AI ishlatilishi")
                    Text("So'rovlar: ${data.aiToday.requests}", color = p.ink, fontWeight = FontWeight.SemiBold)
                    Text("Tokenlar: ${data.aiToday.tokens}", color = p.muted, fontSize = 13.sp)
                    Text("Faol bo'lmagan maktablar: ${data.organizations.suspended}", color = p.muted, fontSize = 12.sp)
                }
            }
            PrimaryButton("Maktablar ro'yxati →", onClick = openOrganizations, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun SuperOrganizations(openOrganization: (String) -> Unit) {
    val p = P
    val remote = rememberRemoteList("/api/v1/super/organizations", SuperOrganization.serializer())
    var query by remember { mutableStateOf("") }
    val list = (remote.state as? UiState.Ready)?.value.orEmpty()
        .filter { it.name.contains(query, true) }
    RefreshColumn(listOf(remote)) {
        Hero("Super admin", "Maktablar", "Tashkilotlar holati va foydalanuvchilari")
        BasicTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
            cursorBrush = SolidColor(p.accent),
            modifier = Modifier.fillMaxWidth().background(p.surface, RoundedCornerShape(15.dp))
                .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(15.dp))
                .padding(horizontal = 15.dp, vertical = 13.dp),
            decorationBox = { inner -> if (query.isEmpty()) Text("Maktab nomini qidirish…", color = p.faint); inner() },
        )
        Section(remote) {
            if (list.isEmpty()) EmptyText("Maktab topilmadi")
            list.forEachIndexed { index, org ->
                Panel(Modifier.stagger(index).pressable { openOrganization(org.id) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(org.name, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                            Pill(if (org.status == "ACTIVE") "Faol" else "To'xtatilgan", if (org.status == "ACTIVE") p.teal else p.coral)
                        }
                        Text("${org.users} foydalanuvchi · ${org.groups} guruh", color = p.muted, fontSize = 12.sp)
                        Text("Adminlar: ${org.admins.joinToString { it.name }.ifBlank { "Biriktirilmagan" }}", color = p.faint, fontSize = 12.sp)
                        Text("Batafsil →", color = p.accent, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun SuperOrganizationDetail(id: String, onBack: () -> Unit) {
    val p = P
    val remote = rememberRemote("/api/v1/super/organizations/$id/detail", SuperOrgDetail.serializer())
    RefreshColumn(listOf(remote)) {
        BackHeader("Maktab tafsilotlari", onBack)
        Section(remote) { data ->
            Hero("Tashkilot", data.org.name, data.org.note)
            KpiRow(listOf(
                Triple("O'quvchilar", data.counts.students, p.accent),
                Triple("O'qituvchi", data.counts.teachers, p.sky),
                Triple("Admin", data.counts.admins, p.gold),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SectionTitle("To'lov holati")
                    Text("Oy: ${data.studentPayments.month}", color = p.muted, fontSize = 12.sp)
                    Text("Yig'ilgan: ${money(data.studentPayments.collected.toDouble())}", color = p.teal, fontWeight = FontWeight.Bold)
                    Text("Kutilgan: ${money(data.studentPayments.expected.toDouble())}", color = p.ink)
                    Text("To'lov qilganlar: ${data.studentPayments.paidCount}", color = p.muted, fontSize = 12.sp)
                    Pill("Obuna: ${data.subscription.state}", if (data.subscription.state == "PAID") p.teal else p.gold)
                }
            }
            SectionTitle("Guruhlar · ${data.groups.size}")
            if (data.groups.isEmpty()) EmptyText("Guruhlar mavjud emas")
            data.groups.forEach { group ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(group.name, color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text("${group.members} o'quvchi · ${group.teacher ?: "O'qituvchi biriktirilmagan"}", color = p.muted, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
