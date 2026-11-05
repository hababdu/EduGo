package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import uz.edugo.mobile.data.AddGroupStudentBody
import uz.edugo.mobile.data.AdminGroupMember
import uz.edugo.mobile.data.AdminUserItem
import uz.edugo.mobile.data.GroupItem

@Composable
fun AdminGroupDetailScreen(groupId: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val group = rememberRemote("/api/v1/groups/$groupId", GroupItem.serializer())
    val members = rememberRemoteList("/api/v1/groups/$groupId/students", AdminGroupMember.serializer())
    val users = rememberRemoteList("/api/v1/users", AdminUserItem.serializer())
    var adding by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var deleteTarget by remember { mutableStateOf<AdminGroupMember?>(null) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val currentMembers = (members.state as? UiState.Ready)?.value.orEmpty()
    val memberIds = currentMembers.map { it.student.id }.toSet()
    val available = (users.state as? UiState.Ready)?.value.orEmpty().filter {
        it.role == "STUDENT" && it.id !in memberIds &&
            (query.isBlank() || listOf(it.firstName, it.lastName.orEmpty(), it.username.orEmpty()).any { v -> v.contains(query, true) })
    }
    RefreshColumn(listOf(group, members, users)) {
        BackHeader("Guruh boshqaruvi", onBack)
        Section(group) { g ->
            Hero("Administrator", g.name, g.description)
            KpiRow(listOf(
                Triple("A'zolar", g.memberCount, p.accent),
                Triple("Sig'im", g.maxCapacity ?: 0, p.sky),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("O'qituvchi", color = p.faint, fontSize = 11.sp)
                    Text(g.teacher?.let { "${it.firstName} ${it.lastName.orEmpty()}".trim() } ?: "Biriktirilmagan", color = p.ink, fontWeight = FontWeight.SemiBold)
                    Text("Oylik to'lov: ${g.monthlyFee?.let { "${it.toLong()} so'm" } ?: "Belgilanmagan"}", color = p.muted, fontSize = 12.sp)
                    g.room?.let { Text("Xona: $it", color = p.muted, fontSize = 12.sp) }
                }
            }
        }
        Section(members) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                SectionTitle("O'quvchilar · ${currentMembers.size}")
                Text(if (adding) "Yopish" else "+ Qo'shish", color = p.accent, fontWeight = FontWeight.SemiBold, fontSize = 12.sp,
                    modifier = Modifier.pressable { adding = !adding; query = "" }.padding(5.dp))
            }
            if (adding) {
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        BasicTextField(query, { query = it }, singleLine = true,
                            textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                            modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(12.dp)).padding(12.dp),
                            decorationBox = { inner -> if (query.isEmpty()) Text("O'quvchini qidirish", color = p.faint, fontSize = 12.sp); inner() },
                        )
                        if (available.isEmpty()) EmptyText("Qo'shish uchun o'quvchi topilmadi")
                        available.take(20).forEach { student ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(Modifier.weight(1f)) {
                                    Text("${student.firstName} ${student.lastName.orEmpty()}", color = p.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    student.username?.let { Text("@$it", color = p.faint, fontSize = 10.sp) }
                                }
                                Text(if (busyId == student.id) "…" else "Qo'shish", color = p.accent, fontSize = 11.sp,
                                    modifier = Modifier.pressable {
                                        if (busyId == null) {
                                            busyId = student.id
                                            scope.launch {
                                                runCatching {
                                                    api.send("POST", "/api/v1/groups/$groupId/students", AddGroupStudentBody.serializer(), AddGroupStudentBody(student.id))
                                                    members.reload(); group.reload(); users.reload()
                                                }.onFailure { message = it.message ?: "O'quvchi qo'shilmadi" }
                                                busyId = null
                                            }
                                        }
                                    }.padding(5.dp))
                            }
                        }
                    }
                }
            }
            message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
            if (currentMembers.isEmpty()) EmptyText("Guruhda hali o'quvchi yo'q")
            currentMembers.forEachIndexed { index, member ->
                val student = member.student
                Panel(Modifier.stagger(index)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column(Modifier.weight(1f)) {
                            Text(listOfNotNull(student.firstName, student.lastName).joinToString(" ").ifBlank { student.username ?: "O'quvchi" }, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            student.username?.let { Text("@$it", color = p.faint, fontSize = 10.sp) }
                        }
                        Text("Chiqarish", color = p.coral, fontSize = 11.sp, modifier = Modifier.pressable { deleteTarget = member }.padding(5.dp))
                    }
                }
            }
        }
    }
    deleteTarget?.let { member ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("O'quvchini guruhdan chiqarish?") },
            text = { Text("${member.student.firstName} guruhdan chiqariladi. O'quvchi akkaunti o'chirilmaydi.") },
            confirmButton = { TextButton(onClick = {
                deleteTarget = null
                scope.launch {
                    runCatching {
                        api.raw("DELETE", "/api/v1/groups/$groupId/students/${member.student.id}")
                        members.reload(); group.reload()
                    }.onFailure { message = it.message ?: "O'quvchi chiqarilmadi" }
                }
            }) { Text("Chiqarish") } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Bekor qilish") } },
        )
    }
}
