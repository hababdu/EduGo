package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import uz.edugo.mobile.data.AdminUserItem
import uz.edugo.mobile.data.AssignGroupTeacherBody
import uz.edugo.mobile.data.CreateAdminGroupBody
import uz.edugo.mobile.data.GroupItem

@Composable
fun AdminGroupsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val groups = rememberRemoteList("/api/v1/groups", GroupItem.serializer())
    val users = rememberRemoteList("/api/v1/users", AdminUserItem.serializer())
    val teachers = (users.state as? UiState.Ready)?.value.orEmpty().filter { it.role == "TEACHER" }
    var adding by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var fee by remember { mutableStateOf("") }
    var capacity by remember { mutableStateOf("") }
    var teacherId by remember { mutableStateOf("") }
    var assignTarget by remember { mutableStateOf<String?>(null) }
    var deleteTarget by remember { mutableStateOf<GroupItem?>(null) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    RefreshColumn(listOf(groups, users)) {
        Hero("Administrator", "Guruhlar", "Guruh yaratish, oylik to'lov va ustozni biriktirish")
        PrimaryButton(if (adding) "Formani yopish" else "+ Guruh yaratish", modifier = Modifier.fillMaxWidth(), onClick = { adding = !adding; message = null })
        if (adding) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Yangi guruh")
                    AdminGroupField(name, { name = it }, "Guruh nomi *")
                    AdminGroupField(description, { description = it }, "Tavsif")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AdminGroupField(fee, { fee = it.filter(Char::isDigit).take(10) }, "Oylik to'lov (so'm)", Modifier.weight(1f))
                        AdminGroupField(capacity, { capacity = it.filter(Char::isDigit).take(3) }, "Sig'im", Modifier.weight(1f))
                    }
                    SectionTitle("Ustoz (ixtiyoriy)")
                    Text(if (teacherId.isBlank()) "Ustoz tanlanmagan" else teachers.firstOrNull { it.id == teacherId }?.let { "${it.firstName} ${it.lastName.orEmpty()}" } ?: "Tanlandi", color = p.muted, fontSize = 12.sp)
                    teachers.forEach { teacher ->
                        val selected = teacher.id == teacherId
                        Text("${if (selected) "●" else "○"} ${teacher.firstName} ${teacher.lastName.orEmpty()}", color = if (selected) p.accent else p.ink, fontSize = 12.sp,
                            modifier = Modifier.pressable { teacherId = teacher.id }.padding(vertical = 4.dp))
                    }
                    message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
                    PrimaryButton(if (busy) "Yaratilmoqda…" else "Guruhni yaratish", enabled = !busy && name.trim().isNotEmpty() &&
                        (fee.isBlank() || fee.toIntOrNull()?.let { it <= 100_000_000 } == true) &&
                        (capacity.isBlank() || capacity.toIntOrNull()?.let { it in 1..500 } == true),
                        modifier = Modifier.fillMaxWidth(), onClick = {
                            busy = true
                            scope.launch {
                                try {
                                    api.send("POST", "/api/v1/groups", CreateAdminGroupBody.serializer(),
                                        CreateAdminGroupBody(name.trim(), description.trim().ifBlank { null }, teacherId.ifBlank { null }, fee.toIntOrNull(), capacity.toIntOrNull()))
                                    name = ""; description = ""; fee = ""; capacity = ""; teacherId = ""; adding = false; groups.reload()
                                } catch (e: Exception) { message = e.message ?: "Guruh yaratilmadi" }
                                busy = false
                            }
                        })
                }
            }
        }
        Section(groups) { list ->
            SectionTitle("Guruhlar · ${list.size}")
            if (list.isEmpty()) EmptyText("Guruhlar topilmadi")
            list.forEachIndexed { index, group ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text(group.name, color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text("${group.memberCount} a'zo · ${group.teacher?.let { "${it.firstName} ${it.lastName.orEmpty()}".trim() } ?: "Ustoz biriktirilmagan"}", color = p.muted, fontSize = 12.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Ustoz biriktirish", color = p.accent, fontSize = 12.sp, modifier = Modifier.pressable { assignTarget = if (assignTarget == group.id) null else group.id }.padding(vertical = 5.dp))
                            Text("O'chirish", color = p.coral, fontSize = 12.sp, modifier = Modifier.pressable { deleteTarget = group }.padding(vertical = 5.dp))
                        }
                        if (assignTarget == group.id) {
                            teachers.forEach { teacher ->
                                Text("${teacher.firstName} ${teacher.lastName.orEmpty()} · Biriktirish", color = p.ink, fontSize = 12.sp,
                                    modifier = Modifier.fillMaxWidth().pressable {
                                        busy = true
                                        scope.launch {
                                            runCatching {
                                                api.send("PATCH", "/api/v1/groups/${group.id}/teacher", AssignGroupTeacherBody.serializer(), AssignGroupTeacherBody(teacher.id))
                                                groups.reload(); assignTarget = null
                                            }.onFailure { message = it.message ?: "Ustoz biriktirilmadi" }
                                            busy = false
                                        }
                                    }.padding(vertical = 5.dp))
                            }
                        }
                    }
                }
            }
        }
    }
    deleteTarget?.let { group ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Guruh o'chirilsinmi?") },
            text = { Text("${group.name} guruhini o'chirishni tasdiqlang.") },
            confirmButton = { TextButton(onClick = {
                deleteTarget = null
                scope.launch {
                    runCatching { api.raw("DELETE", "/api/v1/groups/${group.id}"); groups.reload() }
                        .onFailure { message = it.message ?: "Guruh o'chirilmadi" }
                }
            }) { Text("O'chirish") } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Bekor qilish") } },
        )
    }
}

@Composable
private fun AdminGroupField(value: String, onValueChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier) {
    val p = P
    BasicTextField(value = value, onValueChange = onValueChange,
        textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
        modifier = modifier.fillMaxWidth().background(p.raised.copy(alpha = 0.5f), RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 11.dp),
        decorationBox = { inner -> if (value.isEmpty()) Text(placeholder, color = p.faint, fontSize = 12.sp); inner() },
    )
}
