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
import androidx.compose.runtime.LaunchedEffect
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
import uz.edugo.mobile.data.AssignGroupTeacherBody
import uz.edugo.mobile.data.UpdateAdminGroupSettingsBody

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
    var editingSettings by remember { mutableStateOf(false) }
    var monthlyFee by remember { mutableStateOf("") }
    var capacity by remember { mutableStateOf("") }
    var room by remember { mutableStateOf("") }
    var telegramUrl by remember { mutableStateOf("") }
    var lessonDays by remember { mutableStateOf(setOf<Int>()) }
    var startTime by remember { mutableStateOf("") }
    var endTime by remember { mutableStateOf("") }
    var savingSettings by remember { mutableStateOf(false) }
    var assigningTeacher by remember { mutableStateOf(false) }
    val currentMembers = (members.state as? UiState.Ready)?.value.orEmpty()
    val memberIds = currentMembers.map { it.student.id }.toSet()
    val available = (users.state as? UiState.Ready)?.value.orEmpty().filter {
        it.role == "STUDENT" && it.id !in memberIds &&
            (query.isBlank() || listOf(it.firstName, it.lastName.orEmpty(), it.username.orEmpty()).any { v -> v.contains(query, true) })
    }
    val groupData = (group.state as? UiState.Ready)?.value
    LaunchedEffect(groupData?.id) {
        groupData?.let { g ->
            monthlyFee = g.monthlyFee?.toLong()?.toString().orEmpty()
            capacity = g.maxCapacity?.toString().orEmpty()
            room = g.room.orEmpty()
            telegramUrl = g.telegramChatUrl.orEmpty()
            lessonDays = g.lessonDays?.toSet() ?: emptySet()
            startTime = g.lessonStartTime.orEmpty()
            endTime = g.lessonEndTime.orEmpty()
        }
    }
    val teachers = (users.state as? UiState.Ready)?.value.orEmpty().filter { it.role == "TEACHER" }
    val scheduleValid = lessonDays.isEmpty() && startTime.isBlank() && endTime.isBlank() ||
        lessonDays.isNotEmpty() && Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(startTime) &&
        Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(endTime) && startTime < endTime
    val settingsValid = (capacity.isBlank() || capacity.toIntOrNull()?.let { it in 1..500 && it >= currentMembers.size } == true) &&
        (monthlyFee.isBlank() || monthlyFee.toIntOrNull()?.let { it in 0..100_000_000 } == true) &&
        (telegramUrl.isBlank() || Regex("^https://(t\\.me|telegram\\.me)/[A-Za-z0-9_+/-]{3,100}$").matches(telegramUrl)) && scheduleValid
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
                    val days = g.lessonDays.orEmpty().mapNotNull { listOf("Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya").getOrNull(it - 1) }
                    if (days.isNotEmpty()) Text("Jadval: ${days.joinToString()} · ${g.lessonStartTime ?: "—"}–${g.lessonEndTime ?: "—"}", color = p.muted, fontSize = 12.sp)
                    g.telegramChatUrl?.let { Text("Telegram: $it", color = p.sky, fontSize = 11.sp) }
                    Text(if (editingSettings) "Sozlamalarni yopish" else "Guruh sozlamalarini tahrirlash", color = p.accent, fontWeight = FontWeight.SemiBold, modifier = Modifier.pressable { editingSettings = !editingSettings }.padding(vertical = 8.dp))
                }
            }
            if (editingSettings) Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Jadval va guruh parametrlari")
                    BasicTextField(monthlyFee, { monthlyFee = it.filter(Char::isDigit).take(9) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp), decorationBox = { inner -> if (monthlyFee.isEmpty()) Text("Oylik to'lov (so'm)", color = p.faint); inner() })
                    BasicTextField(capacity, { capacity = it.filter(Char::isDigit).take(3) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp), decorationBox = { inner -> if (capacity.isEmpty()) Text("Sig'im (1–500)", color = p.faint); inner() })
                    BasicTextField(room, { room = it.take(60) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp), decorationBox = { inner -> if (room.isEmpty()) Text("Xona", color = p.faint); inner() })
                    BasicTextField(telegramUrl, { telegramUrl = it.trim().take(150) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp), decorationBox = { inner -> if (telegramUrl.isEmpty()) Text("Telegram havolasi https://t.me/...", color = p.faint); inner() })
                    SectionTitle("Dars kunlari")
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf("Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya").forEachIndexed { i, label ->
                            val day = i + 1; val selected = day in lessonDays
                            Text(label, color = if (selected) p.base else p.muted, fontSize = 10.sp, modifier = Modifier.background(if (selected) p.accent else p.raised, RoundedCornerShape(20.dp)).pressable { lessonDays = if (selected) lessonDays - day else lessonDays + day }.padding(horizontal = 8.dp, vertical = 8.dp))
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BasicTextField(startTime, { startTime = it.take(5) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 12.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.weight(1f).background(p.raised, RoundedCornerShape(10.dp)).padding(10.dp), decorationBox = { inner -> if (startTime.isEmpty()) Text("Boshlanish HH:mm", color = p.faint, fontSize = 10.sp); inner() })
                        BasicTextField(endTime, { endTime = it.take(5) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 12.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.weight(1f).background(p.raised, RoundedCornerShape(10.dp)).padding(10.dp), decorationBox = { inner -> if (endTime.isEmpty()) Text("Tugash HH:mm", color = p.faint, fontSize = 10.sp); inner() })
                    }
                    if (!settingsValid) Text("Sig'im, to'lov, Telegram havolasi yoki dars jadvali noto'g'ri.", color = p.coral, fontSize = 11.sp)
                    PrimaryButton(if (savingSettings) "Saqlanmoqda…" else "Sozlamalarni saqlash", enabled = !savingSettings && settingsValid, modifier = Modifier.fillMaxWidth(), onClick = {
                        savingSettings = true
                        scope.launch {
                            runCatching {
                                api.send("PATCH", "/api/v1/groups/$groupId", UpdateAdminGroupSettingsBody.serializer(),
                                    UpdateAdminGroupSettingsBody(monthlyFee.toIntOrNull(), capacity.toIntOrNull(), lessonDays.takeIf { it.isNotEmpty() }?.sorted(), startTime.ifBlank { null }, endTime.ifBlank { null }, room.trim().ifBlank { null }, telegramUrl.trim().ifBlank { null }))
                                group.reload(); message = "Guruh sozlamalari saqlandi"
                            }.onFailure { message = it.message ?: "Sozlamalar saqlanmadi" }
                            savingSettings = false
                        }
                    })
                }
            }
            SectionTitle("Asosiy o'qituvchi")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(groupData?.teacher?.let { "${it.firstName} ${it.lastName.orEmpty()}".trim() } ?: "Biriktirilmagan", color = p.ink, fontSize = 12.sp)
                Text(if (assigningTeacher) "Yopish" else "O'zgartirish", color = p.accent, fontSize = 11.sp, modifier = Modifier.pressable { assigningTeacher = !assigningTeacher }.padding(5.dp))
            }
            if (assigningTeacher) {
                teachers.forEach { teacher ->
                    Text("${teacher.firstName} ${teacher.lastName.orEmpty()} · ${teacher.username?.let { "@$it" } ?: ""}", color = p.ink, fontSize = 12.sp,
                        modifier = Modifier.fillMaxWidth().pressable {
                            scope.launch {
                                runCatching {
                                    api.send("PATCH", "/api/v1/groups/$groupId/teacher", AssignGroupTeacherBody.serializer(), AssignGroupTeacherBody(teacher.id))
                                    group.reload(); assigningTeacher = false; message = "O'qituvchi biriktirildi"
                                }.onFailure { message = it.message ?: "O'qituvchi biriktirilmadi" }
                            }
                        }.padding(vertical = 6.dp))
                }
                Text("O'qituvchini olib tashlash", color = p.coral, fontSize = 11.sp, modifier = Modifier.pressable {
                    scope.launch {
                        runCatching {
                            api.send("PATCH", "/api/v1/groups/$groupId/teacher", AssignGroupTeacherBody.serializer(), AssignGroupTeacherBody(""))
                            group.reload(); assigningTeacher = false
                        }.onFailure { message = it.message ?: "O'qituvchi olib tashlanmadi" }
                    }
                }.padding(6.dp))
            }
            message?.let { Text(it, color = if (it.contains("saqlandi") || it.contains("biriktirildi")) p.teal else p.coral, fontSize = 11.sp) }
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
