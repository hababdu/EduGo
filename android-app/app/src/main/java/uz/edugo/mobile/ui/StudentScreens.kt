package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.AuthUser
import uz.edugo.mobile.data.DashboardData
import uz.edugo.mobile.data.RankingData
import uz.edugo.mobile.data.Standing
import uz.edugo.mobile.data.Task
import uz.edugo.mobile.data.TodayLesson

@Composable
private fun TaskBadge(t: Task) {
    val p = P
    when {
        t.state == "RETURNED" -> Pill("Qaytarildi", p.coral)
        t.state == "GRADED" -> Pill("${t.score ?: "—"}/${t.maxScore}", p.teal)
        t.state == "SUBMITTED" -> Pill("Topshirildi", p.sky)
        t.overdue -> Pill("Muddati o'tgan", p.coral)
        else -> Pill("Topshiring", p.gold)
    }
}

@Composable
fun TaskList(tasks: List<Task>, onOpen: (String) -> Unit) {
    val p = P
    tasks.forEachIndexed { i, t ->
        Panel(Modifier.stagger(i).pressable { onOpen(t.id) }) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(t.title, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    val due = if (t.dueAt != null && t.state == "PENDING") " · muddat ${fmtDue(t.dueAt)}" else ""
                    Text(t.groupName + due, color = p.muted, fontSize = 12.sp)
                }
                TaskBadge(t)
            }
        }
    }
}

@Composable
fun StudentHome(user: AuthUser, openTask: (String) -> Unit, openRanking: () -> Unit, openTasks: () -> Unit) {
    val p = P
    val dash = rememberRemote("/api/v1/dashboard/me", DashboardData.serializer())
    val today = rememberRemoteList("/api/v1/groups/schedule/today", TodayLesson.serializer())
    val tasks = rememberRemoteList("/api/v1/dashboard/tasks", Task.serializer())
    val standing = rememberRemoteList("/api/v1/dashboard/standing", Standing.serializer())

    RefreshColumn(listOf(dash, today, tasks, standing)) {
        // Welcome panel — international EdTech dashboard hierarchy.
        Column(
            Modifier.fillMaxWidth()
                .background(Brush.linearGradient(listOf(p.accent, p.accent2)), RoundedCornerShape(28.dp))
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text("EDUGO • O'QUVCHI", color = Color.White.copy(alpha = 0.78f), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.4.sp)
            Text("Salom, ${user.firstName}!", color = Color.White, fontSize = 27.sp, fontWeight = FontWeight.ExtraBold)
            Text("Bugun yangi bilimlar sari yana bir qadam.", color = Color.White.copy(alpha = 0.88f), fontSize = 13.sp)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.background(Color.White.copy(alpha = 0.18f), CircleShape).padding(horizontal = 12.dp, vertical = 7.dp)) {
                    Text("✦  O'rganishni davom eting", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Section(dash) { d ->
            SectionTitle("Sizning natijalaringiz")
            KpiRow(listOf(
                Triple("Jami ball", d.stats.totalScore, p.gold),
                Triple("Daraja", d.stats.level, p.accent),
                Triple("Reyting", d.student.rank, p.sky),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Keyingi bosqich", color = p.ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Text("Maqsad sari har kuni intiling", color = p.muted, fontSize = 11.sp)
                        }
                        Text("${d.stats.xpIntoLevel}/${d.stats.xpForNextLevel} XP", color = p.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    AnimatedProgress(d.stats.xpIntoLevel.toFloat() / d.stats.xpForNextLevel.coerceAtLeast(1), p.accent)
                    if (d.student.streak > 0) {
                        Text("🔥  ${d.student.streak} kunlik uzluksiz o'qish", color = p.gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            d.continueLesson?.let { c ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("DAVOM ETING", color = p.accent, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                            Pill("${c.progressPercent.toInt()}% bajarildi", p.teal)
                        }
                        Text(c.subjectTitle, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        AnimatedProgress((c.progressPercent / 100.0).toFloat(), p.teal)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Text("Reytingni ko'rish  →", color = p.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f).pressable(openRanking).background(p.accent.copy(alpha = 0.09f), RoundedCornerShape(14.dp)).padding(12.dp))
                Text("Barcha vazifalar  →", color = p.accent, fontSize = 12.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f).pressable(openTasks).background(p.accent.copy(alpha = 0.09f), RoundedCornerShape(14.dp)).padding(12.dp))
            }
        }
        SectionTitle("Bugungi reja")
        TodayLessonsSection(today)
        Section(tasks) { list ->
            val active = list.filter { it.state == "PENDING" || it.state == "RETURNED" }
            SectionTitle(if (active.isEmpty()) "Vazifalar" else "Vazifalar • ${active.size} ta kutilmoqda")
            if (list.isEmpty()) Panel { Text("Hozircha vazifa yo'q", color = p.muted, fontSize = 14.sp) }
            TaskList(list.take(4), openTask)
        }
        Section(standing) { list ->
            if (list.isNotEmpty()) {
                SectionTitle("Guruhlar holati")
                StandingList(list)
            }
        }
        Section(dash) { d ->
            if (d.recentResults.isNotEmpty()) {
                SectionTitle("So'nggi natijalar")
                d.recentResults.take(5).forEachIndexed { i, r ->
                    Panel(Modifier.stagger(i)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(r.testTitle, color = p.ink, modifier = Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            Pill("${r.percent.toInt()}%", if (r.passed) p.teal else p.coral)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StudentTasks(openTask: (String) -> Unit) {
    val tasks = rememberRemoteList("/api/v1/dashboard/tasks", Task.serializer())
    RefreshColumn(listOf(tasks)) {
        Hero("Vazifalar", "Uy vazifalarim", "Muddat, holat va baho")
        Section(tasks) { list ->
            if (list.isEmpty()) EmptyText("Hozircha vazifa yo'q")
            TaskList(list, openTask)
        }
    }
}

@Composable
fun RankingScreen() {
    val p = P
    val r = rememberRemote("/api/v1/ranking/global", RankingData.serializer())
    RefreshColumn(listOf(r)) {
        Section(r) { d ->
            Hero("EDUGO LIDERLAR JADVALI", d.yourRank?.let { "Siz $it-o'rindasiz" } ?: "Umumiy reyting", "Faollik va bilim natijalari bo'yicha eng yaxshi o'quvchilar")
            d.top.forEachIndexed { i, e ->
                val mine = d.yourRank != null && e.rank == d.yourRank
                Panel(Modifier.stagger(i)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        val medal = when (e.rank) { 1 -> "🥇"; 2 -> "🥈"; 3 -> "🥉"; else -> "${e.rank}" }
                        Text(medal, color = p.muted, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 2.dp).then(Modifier))
                        Avatar(e.firstName, size = 38.dp)
                        Column(Modifier.weight(1f)) {
                            Text(e.firstName, color = if (mine) p.accent else p.ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            e.username?.let { Text("@$it", color = p.faint, fontSize = 11.sp) }
                        }
                        Pill("${e.totalScore} ball", p.gold)
                    }
                }
            }
        }
    }
}
