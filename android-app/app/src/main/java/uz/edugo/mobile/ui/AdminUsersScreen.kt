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
import uz.edugo.mobile.data.AdminUserItem
import uz.edugo.mobile.data.UpdateAdminRoleBody

@Composable
fun AdminUsersScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemoteList("/api/v1/users", AdminUserItem.serializer())
    var search by remember { mutableStateOf("") }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val all = (remote.state as? UiState.Ready)?.value.orEmpty()
    val users = all.filter {
        val q = search.trim()
        q.isBlank() || listOf(it.firstName, it.lastName.orEmpty(), it.username.orEmpty()).any { v -> v.contains(q, true) }
    }
    RefreshColumn(listOf(remote)) {
        Hero("Administrator", "Foydalanuvchilar", "O'quvchi va o'qituvchi rollarini boshqarish")
        BasicTextField(search, { search = it }, singleLine = true,
            textStyle = TextStyle(color = p.ink, fontSize = 14.sp), cursorBrush = SolidColor(p.accent),
            modifier = Modifier.fillMaxWidth().background(p.surface, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 12.dp),
            decorationBox = { inner -> if (search.isEmpty()) Text("Ism yoki username bo'yicha qidirish", color = p.faint, fontSize = 12.sp); inner() },
        )
        Section(remote) {
            Text("Jami: ${users.size} / ${all.size}", color = p.muted, fontSize = 12.sp)
            message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
            users.forEachIndexed { index, user ->
                val name = listOfNotNull(user.firstName, user.lastName).joinToString(" ").ifBlank { user.username ?: "Foydalanuvchi" }
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(Modifier.weight(1f)) {
                                Text(name, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                user.username?.let { Text("@$it", color = p.faint, fontSize = 11.sp) }
                            }
                            Pill(roleLabel(user.role), if (user.role == "TEACHER") p.teal else if (user.role == "ADMIN") p.accent else p.sky)
                        }
                        if (user.role == "STUDENT" || user.role == "TEACHER") {
                            val next = if (user.role == "STUDENT") "TEACHER" else "STUDENT"
                            Text(if (busyId == user.id) "Yangilanmoqda…" else if (next == "TEACHER") "O'qituvchi qilish" else "O'quvchi roliga qaytarish",
                                color = p.accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.pressable {
                                    if (busyId == null) {
                                        busyId = user.id
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/users/${user.id}/role", UpdateAdminRoleBody.serializer(), UpdateAdminRoleBody(next))
                                                remote.reload()
                                            }.onFailure { message = it.message ?: "Rol o'zgartirilmadi" }
                                            busyId = null
                                        }
                                    }
                                }.padding(vertical = 6.dp))
                        } else {
                            Text("Yuqori darajadagi rol — faqat super administrator boshqaradi", color = p.faint, fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun roleLabel(role: String) = when (role) {
    "STUDENT" -> "O'quvchi"
    "TEACHER" -> "O'qituvchi"
    "ADMIN" -> "Administrator"
    "SUPER_ADMIN" -> "Super admin"
    "PARENT" -> "Ota-ona"
    else -> role
}
