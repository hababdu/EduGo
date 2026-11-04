package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.AdminOverview
import uz.edugo.mobile.data.AdminStudentPage
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.AttendanceDay
import uz.edugo.mobile.data.AttendanceRecord
import uz.edugo.mobile.data.AttendanceSave
import uz.edugo.mobile.data.AuthUser
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.GroupStudent
import uz.edugo.mobile.data.TeacherOverview
import uz.edugo.mobile.data.TeacherTodo
import uz.edugo.mobile.data.TodayLesson
import java.net.URLEncoder

@Composable
fun BackHeader(title: String, onBack: () -> Unit) {
    val p = P
    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.pressable(onBack).padding(10.dp)) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Orqaga", tint = p.ink)
        }
        Text(title, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 18.sp, maxLines = 1)
    }
}

/* ---------------- O'qituvchi ---------------- */

@Composable
fun TeacherHome(user: AuthUser, openGroup: (String) -> Unit) {
    val p = P
    val ov = rememberRemote("/api/v1/teacher/overview", TeacherOverview.serializer())
    val todo = rememberRemote("/api/v1/teacher/todo", TeacherTodo.serializer())
    val today = rememberRemoteList("/api/v1/groups/schedule/today", TodayLesson.serializer())
    RefreshColumn(listOf(ov, todo, today)) {
        Hero("O'qituvchi paneli", "Salom, ${user.firstName}!", "Guruhlar, davomat va baholash navbati")
        Section(ov) { o ->
            KpiRow(listOf(Triple("Guruhlar", o.groupsCount, p.accent), Triple("O'quvchilar", o.studentsCount, p.sky), Triple("Testlar", o.assignedTestsCount, p.gold)))
        }
        TodayLessonsSection(today)
        Section(todo) { t ->
            if (t.toGrade.isNotEmpty()) {
                SectionTitle("Baholash kutmoqda (${t.toGradeTotal})")
                t.toGrade.forEachIndexed { i, g ->
                    Panel(Modifier.stagger(i).pressable { openGroup(g.groupId) }) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(g.title, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text(g.groupName, color = p.muted, fontSize = 12.sp)
                            }
                            Pill("${g.pending} ta", p.gold)
                        }
                    }
                }
            }
            if (t.atRisk.isNotEmpty()) {
                SectionTitle("E'tibor talab qiladi (davomat < 70%)")
                t.atRisk.forEachIndexed { i, s ->
                    Panel(Modifier.stagger(i).pressable { openGroup(s.groupId) }) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Column(Modifier.weight(1f)) {
                                Text(s.name, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                Text("${s.groupName} · ${s.absent} marta kelmagan", color = p.muted, fontSize = 12.sp)
                            }
                            Pill("${s.attendancePct}%", p.coral)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GroupsScreen(openGroup: (String) -> Unit) {
    val p = P
    val groups = rememberRemoteList("/api/v1/groups", GroupItem.serializer())
    RefreshColumn(listOf(groups)) {
        Hero("Guruhlar", "Guruhlarim", "Davomat va o'quvchilar natijasi")
        Section(groups) { list ->
            if (list.isEmpty()) EmptyText("Guruh topilmadi")
            list.forEachIndexed { i, g ->
                Panel(Modifier.stagger(i).pressable { openGroup(g.id) }) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Avatar(g.name, size = 44.dp)
                        Column(Modifier.weight(1f)) {
                            Text(g.name, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            val t = g.teacher?.let { "${it.firstName} ${it.lastName ?: ""}".trim() }
                            if (!t.isNullOrBlank()) Text(t, color = p.muted, fontSize = 12.sp)
                        }
                        Pill("${g.memberCount} o'quvchi", p.sky)
                    }
                }
            }
        }
    }
}

@Composable
fun GroupDetailScreen(groupId: String, onBack: () -> Unit, openAssignment: (String) -> Unit) {
    val p = P
    var tab by remember { mutableStateOf(0) }
    val group = rememberRemote("/api/v1/groups/$groupId", GroupItem.serializer())
    Column {
        BackHeader((group.state as? UiState.Ready)?.value?.name ?: "Guruh", onBack)
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Davomat", "O'quvchilar", "Vazifalar").forEachIndexed { i, label ->
                val on = tab == i
                Text(
                    label,
                    color = if (on) (if (p.dark) p.base else androidx.compose.ui.graphics.Color.White) else p.ink,
                    fontWeight = FontWeight.SemiBold, fontSize = 14.sp,
                    modifier = Modifier
                        .background(if (on) p.accent else p.ink.copy(alpha = 0.08f), CircleShape)
                        .pressable { tab = i }
                        .padding(horizontal = 18.dp, vertical = 9.dp),
                )
            }
        }
        when (tab) {
            0 -> AttendanceEditor(groupId)
            1 -> GroupStudents(groupId)
            else -> TeacherGroupAssignments(groupId, openAssignment)
        }
    }
}

@Composable
private fun GroupStudents(groupId: String) {
    val p = P
    val r = rememberRemoteList("/api/v1/teacher/groups/$groupId/students", GroupStudent.serializer())
    RefreshColumn(listOf(r)) {
        Section(r) { list ->
            if (list.isEmpty()) EmptyText("Guruhda o'quvchi yo'q")
            list.forEachIndexed { i, s ->
                Panel(Modifier.stagger(i)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Avatar(s.firstName, size = 40.dp)
                        Column(Modifier.weight(1f)) {
                            Text(s.fullName, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("${s.level}-daraja · ${s.testsCompleted} ta test", color = p.muted, fontSize = 12.sp)
                        }
                        s.averagePercent?.let { Pill("${it.toInt()}%", if (it >= 60) p.teal else p.coral) }
                    }
                }
            }
        }
    }
}

@Composable
private fun AttendanceEditor(groupId: String) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val date = remember { todayTashkent() }
    val day = rememberRemote("/api/v1/groups/$groupId/attendance?date=$date", AttendanceDay.serializer())
    val marks = remember(groupId) { mutableStateMapOf<String, String>() }
    var saving by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf<String?>(null) }
    val ready = (day.state as? UiState.Ready)?.value
    LaunchedEffect(ready) {
        ready?.students?.forEach { s -> if (s.status != null && marks[s.studentId] == null) marks[s.studentId] = s.status }
    }
    RefreshColumn(listOf(day)) {
        Section(day) { d ->
            Text("Sana: ${fmtDay(d.date)} · belgilandi ${d.markedCount}/${d.students.size}", color = p.muted, fontSize = 13.sp)
            if (d.isLessonDay == false) Text("Bugun jadvalda dars yo'q, lekin belgilash mumkin", color = p.gold, fontSize = 12.sp)
            if (d.students.isEmpty()) EmptyText("Guruhda o'quvchi yo'q")
            d.students.forEachIndexed { i, s ->
                Panel(Modifier.stagger(i)) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(s.fullName, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("PRESENT" to ("Keldi" to p.teal), "ABSENT" to ("Kelmadi" to p.coral), "EXCUSED" to ("Sababli" to p.sky)).forEach { (code, lc) ->
                                val on = marks[s.studentId] == code
                                Text(
                                    lc.first, color = if (on) (if (p.dark) p.base else androidx.compose.ui.graphics.Color.White) else lc.second,
                                    fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier
                                        .background(if (on) lc.second else lc.second.copy(alpha = 0.14f), CircleShape)
                                        .pressable { marks[s.studentId] = code; info = null }
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                )
                            }
                        }
                    }
                }
            }
            if (d.students.isNotEmpty()) {
                PrimaryButton(
                    if (saving) "Saqlanmoqda…" else "Davomatni saqlash",
                    enabled = !saving && marks.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        saving = true; info = null
                        scope.launch {
                            info = try {
                                val body = AttendanceSave(d.date.ifBlank { date }, marks.map { AttendanceRecord(it.key, it.value) })
                                api.send("PUT", "/api/v1/groups/$groupId/attendance", AttendanceSave.serializer(), body)
                                day.reload()
                                "Saqlandi ✓"
                            } catch (e: ApiException) {
                                e.message ?: "Saqlab bo'lmadi"
                            }
                            saving = false
                        }
                    },
                )
                info?.let { Text(it, color = if (it.startsWith("Saqlandi")) p.teal else p.coral, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
            }
        }
    }
}

/* ---------------- Admin ---------------- */

@Composable
fun AdminHome(user: AuthUser) {
    val p = P
    val ov = rememberRemote("/api/v1/admin/overview", AdminOverview.serializer())
    RefreshColumn(listOf(ov)) {
        Hero(if (user.role == "SUPER_ADMIN") "Platforma" else "Maktab administratori", "Boshqaruv paneli", "Ko'rsatkichlar bir joyda")
        Section(ov) { o ->
            KpiRow(listOf(Triple("O'quvchilar", o.totals.students, p.accent), Triple("Faol", o.totals.activeStudents, p.teal), Triple("O'qituvchilar", o.totals.teachers, p.sky)))
            KpiRow(listOf(Triple("Kurslar", o.totals.courses, p.gold), Triple("Testlar", o.totals.tests, p.accent2), Triple("Bugun urinish", o.today.testAttempts, p.coral)))
            val days = o.charts.dailyActiveUsers.takeLast(14)
            if (days.isNotEmpty()) {
                SectionTitle("Faol foydalanuvchilar (14 kun)")
                Panel {
                    val max = (days.maxOf { it.count }).coerceAtLeast(1)
                    Row(Modifier.fillMaxWidth().height(110.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.Bottom) {
                        days.forEachIndexed { i, d ->
                            var go by remember { mutableStateOf(false) }
                            LaunchedEffect(Unit) { delay(i * 40L); go = true }
                            val h by androidx.compose.animation.core.animateFloatAsState(if (go) d.count.toFloat() / max else 0f, androidx.compose.animation.core.tween(700), label = "bar")
                            Box(Modifier.weight(1f).fillMaxWidth().height((8 + 100 * h).dp).background(p.accent.copy(alpha = 0.85f), RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp)))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AdminStudents() {
    val p = P
    var query by remember { mutableStateOf("") }
    var debounced by remember { mutableStateOf("") }
    var page by remember { mutableStateOf(1) }
    LaunchedEffect(query) { delay(400); if (debounced != query) { debounced = query; page = 1 } }
    val path = "/api/v1/admin/students?page=$page&pageSize=20" + if (debounced.isNotBlank()) "&search=" + URLEncoder.encode(debounced, "UTF-8") else ""
    val r = rememberRemote(path, AdminStudentPage.serializer())
    RefreshColumn(listOf(r)) {
        Hero("O'quvchilar", "Barcha o'quvchilar", "Ism yoki username bo'yicha qidiring")
        BasicTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
            cursorBrush = SolidColor(p.accent),
            modifier = Modifier.fillMaxWidth().background(p.surface.copy(alpha = 0.7f), RoundedCornerShape(16.dp)).border(1.dp, p.ink.copy(alpha = 0.1f), RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 14.dp),
            decorationBox = { inner -> if (query.isEmpty()) Text("Qidirish…", color = p.faint, fontSize = 15.sp); inner() },
        )
        Section(r) { d ->
            if (d.items.isEmpty()) EmptyText("O'quvchi topilmadi")
            d.items.forEachIndexed { i, s ->
                Panel(Modifier.stagger(i)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Avatar(s.firstName, size = 42.dp)
                        Column(Modifier.weight(1f)) {
                            Text(s.fullName.ifBlank { s.username ?: "—" }, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("${s.level}-daraja · ${s.totalScore} ball", color = p.muted, fontSize = 12.sp)
                        }
                        when (s.status) {
                            "BLOCKED" -> Pill("Bloklangan", p.coral)
                            "PENDING" -> Pill("Kutilmoqda", p.gold)
                        }
                    }
                }
            }
            if (d.totalPages > 1) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("‹ Oldingi", color = if (page > 1) p.accent else p.faint, fontWeight = FontWeight.Bold, modifier = Modifier.pressable { if (page > 1) page-- }.padding(10.dp))
                    Text("$page / ${d.totalPages} · jami ${d.total}", color = p.muted, fontSize = 12.sp)
                    Text("Keyingi ›", color = if (page < d.totalPages) p.accent else p.faint, fontWeight = FontWeight.Bold, modifier = Modifier.pressable { if (page < d.totalPages) page++ }.padding(10.dp))
                }
            }
        }
    }
}
