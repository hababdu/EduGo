package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
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
import uz.edugo.mobile.data.BlockSuperUserBody
import uz.edugo.mobile.data.MoveSuperAdminBody
import uz.edugo.mobile.data.SuperAdminRow
import uz.edugo.mobile.data.SuperOrganization

@Composable
fun SuperAdminsScreen(onBack: (() -> Unit)? = null) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val admins = rememberRemoteList("/api/v1/super/admins", SuperAdminRow.serializer())
    val orgs = rememberRemoteList("/api/v1/super/organizations", SuperOrganization.serializer())
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val orgList = (orgs.state as? UiState.Ready)?.value.orEmpty()
    RefreshColumn(listOf(admins, orgs)) {
        if (onBack != null) BackHeader("Administratorlar", onBack)
        Hero("Super admin", "Maktab adminlari", "Admin akkauntlari, bloklash va tashkilotga biriktirish")
        message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
        Section(admins) { list ->
            if (list.isEmpty()) EmptyText("Adminlar topilmadi")
            list.forEachIndexed { index, admin ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(Modifier.weight(1f)) {
                                Text(admin.name, color = p.ink, fontWeight = FontWeight.SemiBold)
                                Text("${admin.role} · ${admin.username?.let { "@$it" } ?: admin.telegramId}", color = p.muted, fontSize = 11.sp)
                            }
                            Pill(if (admin.status == "BLOCKED") "Bloklangan" else "Faol", if (admin.status == "BLOCKED") p.coral else p.teal)
                        }
                        Text("Tashkilot: ${admin.organization?.name ?: "Biriktirilmagan"}", color = p.muted, fontSize = 12.sp)
                        Text("Oxirgi faollik: ${admin.lastActiveAt.ifBlank { "noma'lum" }}", color = p.faint, fontSize = 10.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(if (admin.status == "BLOCKED") "Blokdan chiqarish" else "Bloklash", color = if (admin.status == "BLOCKED") p.teal else p.coral,
                                fontSize = 11.sp, modifier = Modifier.pressable {
                                    if (busyId == null) {
                                        busyId = admin.id
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/super/users/${admin.id}/block", BlockSuperUserBody.serializer(), BlockSuperUserBody(admin.status != "BLOCKED"))
                                                admins.reload()
                                            }.onFailure { message = it.message ?: "Holat o'zgarmadi" }
                                            busyId = null
                                        }
                                    }
                                }.padding(vertical = 5.dp))
                        }
                        SectionTitle("Tashkilotni almashtirish")
                        orgList.forEach { org ->
                            if (org.id != admin.organization?.id) {
                                Text("→ ${org.name}", color = p.accent, fontSize = 11.sp, modifier = Modifier.pressable {
                                    if (busyId == null) {
                                        busyId = admin.id
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/super/admins/${admin.id}/organization", MoveSuperAdminBody.serializer(), MoveSuperAdminBody(org.id))
                                                admins.reload()
                                            }.onFailure { message = it.message ?: "Tashkilot o'zgarmadi" }
                                            busyId = null
                                        }
                                    }
                                }.padding(vertical = 3.dp))
                            }
                        }
                        if (busyId == admin.id) Text("Yangilanmoqda…", color = p.faint, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}
