package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
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
import uz.edugo.mobile.data.MemberPage
import uz.edugo.mobile.data.MemberRow

private fun roleUz(r: String) = when (r) { "TEACHER" -> "O'qituvchi"; "ADMIN" -> "Admin"; else -> "O'quvchi" }

/** Maktab a'zolari: kutilayotgan so'rovlar (qabul/rad) va faol a'zolar (rol, chiqarish). */
@Composable
fun AdminMembersScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val pending = rememberRemote("/api/v1/admin/memberships?status=PENDING", MemberPage.serializer())
    val active = rememberRemote("/api/v1/admin/memberships?status=ACTIVE", MemberPage.serializer())
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }

    fun act(id: String, method: String, path: String, body: String?, ok: String) {
        busy = id; message = null
        scope.launch {
            try {
                api.raw(method, path, body)
                message = ok
                pending.reload(); active.reload()
            } catch (e: Exception) { message = e.message ?: "Amal bajarilmadi" } finally { busy = null }
        }
    }

    RefreshColumn(listOf(pending, active)) {
        Hero("EDUGO · MAKTAB", "A'zolar", "Qo'shilish so'rovlari va maktab a'zolari")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        Section(pending) { page ->
            SectionTitle("SO'ROVLAR · ${page.total}")
            if (page.items.isEmpty()) EmptyText("Yangi so'rov yo'q")
            page.items.forEach { m ->
                MemberCard(m, busy == m.id) {
                    TextButton(enabled = busy == null, onClick = { act(m.id, "POST", "/api/v1/admin/memberships/${m.id}/approve", """{"role":"${m.role}"}""", "Qabul qilindi") }) { Text("Qabul") }
                    TextButton(enabled = busy == null, onClick = { act(m.id, "POST", "/api/v1/admin/memberships/${m.id}/reject", "{}", "Rad etildi") }) { Text("Rad etish", color = p.coral) }
                }
            }
        }
        Section(active) { page ->
            SectionTitle("FAOL A'ZOLAR · ${page.total}")
            if (page.items.isEmpty()) EmptyText("A'zolar yo'q")
            page.items.forEach { m ->
                MemberCard(m, busy == m.id) {
                    if (m.role != "ADMIN") {
                        val other = if (m.role == "TEACHER") "STUDENT" else "TEACHER"
                        TextButton(enabled = busy == null, onClick = { act(m.id, "PATCH", "/api/v1/admin/memberships/${m.id}/role", """{"role":"$other"}""", "Rol o'zgartirildi") }) { Text("→ ${roleUz(other)}") }
                        TextButton(enabled = busy == null, onClick = { act(m.id, "DELETE", "/api/v1/admin/memberships/${m.id}", null, "Maktabdan chiqarildi") }) { Text("Chiqarish", color = p.coral) }
                    }
                }
            }
            if (page.pages > 1) Text("1-sahifa / ${page.pages}", color = p.muted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun MemberCard(m: MemberRow, busy: Boolean, actions: @Composable () -> Unit) {
    val p = P
    Panel {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(m.user.name.ifBlank { "Foydalanuvchi" }, color = p.ink, fontWeight = FontWeight.Bold)
                    m.user.username?.let { Text("@$it", color = p.muted, fontSize = 11.sp) }
                }
                Pill(roleUz(m.role), p.accent)
            }
            m.message?.takeIf { it.isNotBlank() }?.let { Text("“$it”", color = p.muted, fontSize = 11.sp) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) { if (!busy) actions() }
        }
    }
}
