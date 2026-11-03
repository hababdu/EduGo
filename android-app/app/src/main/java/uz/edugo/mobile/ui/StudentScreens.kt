package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
fun StudentHome(user: AuthUser, openTask: (String) -> Unit) {
    val p = P
    val dash = rememberRemote("/api/v1/dashboard/me", DashboardData.serializer())
    val today = rememberRemoteList("/api/v1/groups/schedule/today", TodayLesson.serializer())
    val tasks = rememberRemoteList("/api/v1/dashboard/tasks", Task.serializer())
    val standing = rememberRemoteList("/api/v1/dashboard/standing", Standing.serializer())

    RefreshColumn(listOf(dash, today, tasks, standing)) {
        Hero("O'quvchi paneli", "Salom, ${user.firstName}!", "Bugungi darslar, vazifalar va natijalar bir joyda")
        Section(dash) { d ->
            KpiRow(listOf(Triple("Ball", d.stats.totalScore, p.gold), Triple("Daraja", d.stats.level, p.accent), Triple("Reyting", d.student.rank, p.sky)))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Keyingi darajagacha", color = p.muted, fontSize = 12.sp)
                        Text("${d.stats.xpIntoLevel}/${d.stats.xpForNextLevel} XP", color = p.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    AnimatedProgress(d.stats.xpIntoLevel.toFloat() / d.stats.xpForNextLevel.coerceAtLeast(1), p.gold)
                    if (d.student.streak > 0) Text("🔥 ${d.student.streak} kunlik seriya", color = p.gold, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            d.continueLesson?.let { c ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Davom eting", color = p.accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(c.subjectTitle, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        AnimatedProgress((c.progressPercent / 100.0).toFloat(), p.teal)
                    }
                }
            }
        }
        TodayLessonsSection(today)
        Section(tasks) { list ->
            val active = list.filter { it.state == "PENDING" || it.state == "RETURNED" }
            SectionTitle(if (active.isEmpty()) "Vazifalar" else "Vazifalar (${active.size} ta kutmoqda)")
            if (list.isEmpty()) Panel { Text("Hozircha vazifa yo'q", color = p.muted, fontSize = 14.sp) }
            TaskList(list.take(4), openTask)
        }
        Section(standing) { list ->
            if (list.isNotEmpty()) {
                SectionTitle("Davomat va to'lov")
                StandingList(list)
            }
        }
        Section(dash) { d ->
            if (d.recentResults.isNotEmpty()) {
                SectionTitle("So'nggi natijalar")
                d.recentResults.take(5).forEachIndexed { i, r ->
                    Panel(Modifier.stagger(i)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(r.testTitle, color = p.ink, modifier = Modifier.weight(1f), fontSize = 14.sp)
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
            Hero("Reyting", d.yourRank?.let { "Siz $it-o'rindasiz" } ?: "Umumiy reyting", "Eng yaxshi o'quvchilar")
            d.top.forEachIndexed { i, e ->
                val mine = d.yourRank != null && e.rank == d.yourRank
                Panel(Modifier.stagger(i)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        val medal = when (e.rank) { 1 -> "🥇"; 2 -> "🥈"; 3 -> "🥉"; else -> "${e.rank}" }
                        Text(medal, color = p.muted, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 2.dp).then(Modifier))
                        Avatar(e.firstName, size = 38.dp)
                        Column(Modifier.weight(1f)) {
                            Text(e.firstName, color = if (mine) p.accent else p.ink, fontWeight = FontWeight.SemiBold)
                            e.username?.let { Text("@$it", color = p.faint, fontSize = 11.sp) }
                        }
                        Pill("${e.totalScore} ball", p.gold)
                    }
                }
            }
        }
    }
}
