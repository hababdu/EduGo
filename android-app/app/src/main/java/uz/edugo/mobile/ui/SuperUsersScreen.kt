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
import uz.edugo.mobile.data.SuperOrganization
import uz.edugo.mobile.data.SuperUserPage

private fun roleLabel(r: String) = when (r) { "TEACHER" -> "O'qituvchi"; "ADMIN" -> "Admin"; "SUPER_ADMIN" -> "Super admin"; else -> "O'quvchi" }

@Composable
private fun Chip2(label: String, on: Boolean, onClick: () -> Unit) {
    val p = P
    Text(
        label, color = if (on) p.accent else p.faint, fontSize = 12.sp,
        fontWeight = if (on) FontWeight.Bold else FontWeight.Medium,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) p.accent.copy(alpha = 0.16f) else p.surface)
            .pressable(onClick).padding(horizontal = 12.dp, vertical = 7.dp),
    )
}

/** Barcha foydalanuvchilar: qidirish, rol bo'yicha filtr va rolni o'zgartirish (faqat super admin). */
@Composable
fun SuperUsersScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    var search by remember { mutableStateOf("") }
    var roleFilter by remember { mutableStateOf("") }
    val enc = java.net.URLEncoder.encode(search.trim(), "UTF-8")
    val users = rememberRemote("/api/v1/super/all-users?role=$roleFilter&search=$enc", SuperUserPage.serializer())
    val orgs = rememberRemoteList("/api/v1/super/organizations", SuperOrganization.serializer())
    val orgList = (orgs.state as? UiState.Ready)?.value.orEmpty()
    var busy by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var pickOrgFor by remember { mutableStateOf<Pair<String, String>?>(null) } // userId to role

    fun change(id: String, role: String, orgId: String?) {
        busy = id; message = null
        scope.launch {
            try {
                val org = if (orgId != null) ",\"organizationId\":\"$orgId\"" else ""
                api.raw("PATCH", "/api/v1/super/users/$id/role", """{"role":"$role"$org}""")
                message = "Rol o'zgartirildi"; pickOrgFor = null
                users.reload()
            } catch (e: Exception) { message = e.message ?: "Rol o'zgarmadi" } finally { busy = null }
        }
    }

    RefreshColumn(listOf(users)) {
        Hero("SUPER ADMIN", "Foydalanuvchilar", "Barcha foydalanuvchilar va ularning rollari")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        OutlinedTextField(value = search, onValueChange = { search = it }, singleLine = true, modifier = Modifier.fillMaxWidth(), label = { Text("Ism, @username yoki Telegram ID") })
        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("" to "Hammasi", "STUDENT" to "O'quvchi", "TEACHER" to "O'qituvchi", "ADMIN" to "Admin").forEach { (k, l) -> Chip2(l, roleFilter == k) { roleFilter = k } }
        }
        Section(users) { page ->
            SectionTitle("JAMI · ${page.total}")
            if (page.items.isEmpty()) EmptyText("Foydalanuvchi topilmadi")
            page.items.forEach { u ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(Modifier.weight(1f)) {
                                Text(u.name.ifBlank { "Foydalanuvchi" }, color = p.ink, fontWeight = FontWeight.SemiBold)
                                Text("${u.username?.let { "@$it" } ?: u.telegramId} · ${u.organization?.name ?: "Maktabsiz"}", color = p.muted, fontSize = 11.sp)
                            }
                            Pill(roleLabel(u.role), if (u.status == "BLOCKED") p.coral else p.accent)
                        }
                        if (u.role != "SUPER_ADMIN") {
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("STUDENT", "TEACHER", "ADMIN").forEach { r ->
                                    if (r != u.role) Chip2("→ ${roleLabel(r)}", false) {
                                        if (busy != null) return@Chip2
                                        // Maktabsiz foydalanuvchi uchun maktab tanlash kerak
                                        if (u.organization == null) pickOrgFor = u.id to r else change(u.id, r, null)
                                    }
                                }
                            }
                            if (pickOrgFor?.first == u.id) {
                                Text("Qaysi maktabga biriktirilsin?", color = p.muted, fontSize = 11.sp)
                                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    orgList.forEach { o -> Chip2(o.name, false) { change(u.id, pickOrgFor!!.second, o.id) } }
                                }
                            }
                        }
                    }
                }
            }
            if (page.pages > 1) Text("1-sahifa / ${page.pages} — qidiruv bilan toraytiring", color = p.muted, fontSize = 11.sp)
        }
    }
}
