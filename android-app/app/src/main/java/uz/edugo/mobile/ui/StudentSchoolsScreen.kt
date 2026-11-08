package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.SchoolCatalog
import uz.edugo.mobile.data.SchoolMembership
import uz.edugo.mobile.data.SchoolItem

@Composable
fun StudentSchoolsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var search by remember { mutableStateOf("") }
    var refreshKey by remember { mutableStateOf(0) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val catalog = rememberRemote("/api/v1/catalog?sort=rating&search=${java.net.URLEncoder.encode(search, "UTF-8")}", SchoolCatalog.serializer())
    val memberships = rememberRemoteList("/api/v1/memberships/mine", SchoolMembership.serializer())

    RefreshColumn(listOf(catalog, memberships)) {
        Hero("EDUGO MAKTABLARI", "Maktablarni tanlang", "Bir nechta maktabga a'zo bo'lish va so'rovlaringizni kuzatish")
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(16.dp),
            label = { Text("Maktab qidirish") },
        )
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        Section(memberships) { rows ->
            SectionTitle("MENING MAKTABLARIM · ${rows.count { it.status == "ACTIVE" }}")
            if (rows.isEmpty()) EmptyText("Hozircha maktab a'zoligi yo'q")
            rows.forEach { m ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(m.organization.name, color = p.ink, fontWeight = FontWeight.Bold)
                        Text("${m.organization.city.orEmpty()} · ${when (m.status) { "ACTIVE" -> "Faol a'zo"; "PENDING" -> "Tasdiq kutilmoqda"; "REJECTED" -> "Rad etilgan"; else -> m.status }}", color = p.muted, fontSize = 12.sp)
                    }
                }
            }
        }
        Section(catalog) { data ->
            SectionTitle("MAKTABLAR KATALOGI · ${data.total}")
            if (data.items.isEmpty()) EmptyText("Maktab topilmadi")
            data.items.forEach { school ->
                val existing = (memberships.state as? UiState.Ready)?.value?.firstOrNull { it.organization.id == school.id }
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(school.name, color = p.ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(if (school.ratingAvg > 0) "★ ${school.ratingAvg}" else "—", color = p.gold, fontSize = 12.sp)
                        }
                        Text(listOfNotNull(school.city, if (school.ratingCount > 0) "${school.ratingCount} sharh" else null).joinToString(" · "), color = p.muted, fontSize = 11.sp)
                        if (existing != null) {
                            Pill(when (existing.status) { "ACTIVE" -> "A'zo"; "PENDING" -> "So'rov yuborilgan"; "REJECTED" -> "Rad etilgan"; else -> existing.status }, if (existing.status == "ACTIVE") p.teal else p.gold)
                        } else {
                            TextButton(
                                enabled = busyId != school.id,
                                onClick = {
                                    busyId = school.id
                                    message = null
                                    scope.launch {
                                        try {
                                            api.raw("POST", "/api/v1/memberships/requests", """{"organizationId":"${school.id}","role":"STUDENT"}""")
                                            message = "${school.name}: a'zolik so'rovi yuborildi"
                                            catalog.reload()
                                            memberships.reload()
                                        } catch (e: Exception) {
                                            message = e.message ?: "So'rov yuborilmadi"
                                        } finally { busyId = null }
                                    }
                                },
                            ) { Text(if (busyId == school.id) "Yuborilmoqda…" else "A'zo bo'lish") }
                        }
                    }
                }
            }
        }
    }
}
