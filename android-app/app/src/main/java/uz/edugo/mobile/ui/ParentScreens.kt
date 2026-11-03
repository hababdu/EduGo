package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.Child
import uz.edugo.mobile.data.ChildDetail

@Composable
fun ParentHome(openChild: (String) -> Unit) {
    val p = P
    val r = rememberRemoteList("/api/v1/parent/children", Child.serializer())
    RefreshColumn(listOf(r)) {
        Hero("Ota-ona paneli", "Farzandlarim", "Davomat, vazifa va to'lov — bir joyda")
        Section(r) { list ->
            if (list.isEmpty()) EmptyText("Hali farzand ulanmagan. O'quvchidan ota-ona taklif havolasini so'rang va Telegramda oching.")
            list.forEachIndexed { i, c ->
                Panel(Modifier.stagger(i).pressable { openChild(c.id) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Avatar(c.name, size = 44.dp)
                            Text(c.name, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.weight(1f))
                            if (c.pendingTasks > 0) Pill("${c.pendingTasks} ta vazifa", if (c.overdueTasks > 0) p.coral else p.gold)
                        }
                        if (c.standing.isEmpty()) Text("Hozircha guruhga qo'shilmagan", color = p.muted, fontSize = 12.sp)
                        c.standing.forEach { g ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(g.groupName, color = p.ink, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                Text(g.attendancePct?.let { "davomat $it%" } ?: "davomat yo'q", color = p.muted, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ChildScreen(id: String, onBack: () -> Unit) {
    val p = P
    val r = rememberRemote("/api/v1/parent/children/$id", ChildDetail.serializer())
    Column {
        BackHeader((r.state as? UiState.Ready)?.value?.name ?: "Farzand", onBack)
        RefreshColumn(listOf(r)) {
            Section(r) { d ->
                KpiRow(listOf(Triple("Daraja", d.level ?: 0, p.accent), Triple("Ball", d.totalScore ?: 0, p.gold)))
                if (d.standing.isNotEmpty()) {
                    SectionTitle("Davomat va to'lov")
                    StandingList(d.standing)
                }
                if (d.tasks.isNotEmpty()) {
                    SectionTitle("Vazifalar")
                    d.tasks.forEachIndexed { i, t ->
                        Panel(Modifier.stagger(i)) {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(t.title, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                    Text(t.groupName + (t.dueAt?.let { " · ${fmtDue(it)}" } ?: ""), color = p.muted, fontSize = 12.sp)
                                }
                                when (t.state) {
                                    "GRADED" -> Pill("${t.score ?: "—"}/${t.maxScore}", p.teal)
                                    "SUBMITTED" -> Pill("Topshirildi", p.sky)
                                    "RETURNED" -> Pill("Qaytarilgan", p.coral)
                                    else -> Pill(if (t.overdue) "Muddati o'tgan" else "Topshirilmagan", if (t.overdue) p.coral else p.gold)
                                }
                            }
                        }
                    }
                }
                if (d.absences.isNotEmpty()) {
                    SectionTitle("Kelmagan kunlar")
                    d.absences.take(10).forEach { a ->
                        Panel {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text("${fmtDay(a.date)} · ${a.group}", color = p.ink, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                Pill(if (a.status == "EXCUSED") "Sababli" else "Sababsiz", if (a.status == "EXCUSED") p.sky else p.coral)
                            }
                        }
                    }
                }
                if (d.results.isNotEmpty()) {
                    SectionTitle("Test natijalari")
                    d.results.take(8).forEach { t ->
                        Panel {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(t.title, color = p.ink, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                Pill("${t.score}%", if (t.passed) p.teal else p.coral)
                            }
                        }
                    }
                }
                if (d.journal.isNotEmpty()) {
                    SectionTitle("Dars jurnali")
                    d.journal.take(8).forEach { j ->
                        Panel {
                            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                Text("${fmtDay(j.date)} · ${j.group}", color = p.muted, fontSize = 12.sp)
                                Text(j.topic, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                j.homework?.takeIf { it.isNotBlank() }?.let { Text("Uyga vazifa: $it", color = p.gold, fontSize = 12.sp) }
                            }
                        }
                    }
                }
            }
        }
    }
}
