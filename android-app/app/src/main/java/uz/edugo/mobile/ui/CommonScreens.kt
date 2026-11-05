package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.serialization.decodeFromString
import kotlinx.coroutines.launch
import uz.edugo.mobile.BuildConfig
import uz.edugo.mobile.EduGoApp
import uz.edugo.mobile.data.AuthUser
import uz.edugo.mobile.data.ParentInviteData
import uz.edugo.mobile.data.AppJson
import uz.edugo.mobile.data.NotificationItem
import uz.edugo.mobile.data.Standing
import uz.edugo.mobile.data.TodayLesson

/** Bir qatorli ko'rsatkichlar (teng kenglikda). */
@Composable
fun KpiRow(items: List<Triple<String, Int, Color>>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        items.forEachIndexed { i, (label, value, color) ->
            KpiCard(label, value, color, Modifier.weight(1f).stagger(i))
        }
    }
}

/** Bugungi darslar (o'quvchi va o'qituvchi uchun umumiy). */
@Composable
fun TodayLessonsSection(remote: Remote<List<TodayLesson>>) {
    val p = P
    Section(remote) { list ->
        SectionTitle("Bugungi darslar")
        if (list.isEmpty()) {
            Panel { Text("Bugun dars yo'q", color = p.muted, fontSize = 14.sp) }
        } else list.forEachIndexed { i, l ->
            Panel(Modifier.stagger(i)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(
                        Modifier.background(p.accent.copy(alpha = 0.16f), RoundedCornerShape(14.dp)).padding(horizontal = 10.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(l.startTime ?: "--:--", color = p.accent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        if (l.endTime != null) Text(l.endTime, color = p.muted, fontSize = 11.sp)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(l.name, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        val sub = listOfNotNull(
                            l.room?.let { "$it-xona".takeIf { _ -> it.all(Char::isDigit) } ?: it },
                            l.teacher?.let { "${it.firstName} ${it.lastName ?: ""}".trim() },
                        ).joinToString(" · ")
                        if (sub.isNotBlank()) Text(sub, color = p.muted, fontSize = 12.sp)
                    }
                    Pill("${l.membersCount} ta", p.sky)
                }
            }
        }
    }
}

@Composable
fun StandingList(items: List<Standing>) {
    val p = P
    items.forEachIndexed { i, g ->
        Panel(Modifier.stagger(i)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(g.groupName, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    when (g.payment) {
                        "PAID" -> Pill("To'langan", p.teal)
                        "WAIVED" -> Pill("Imtiyoz", p.sky)
                        "UNPAID" -> Pill("To'lanmagan", p.coral)
                    }
                }
                if (g.attendancePct == null) {
                    Text("Davomat hali belgilanmagan", color = p.muted, fontSize = 12.sp)
                } else {
                    val col = if (g.attendancePct >= 80) p.teal else if (g.attendancePct >= 60) p.gold else p.coral
                    Text("Davomat ${g.attendancePct}% · ${g.absent} marta kelmagan (30 kun)", color = p.muted, fontSize = 12.sp)
                    AnimatedProgress(g.attendancePct / 100f, col)
                }
                if (g.fee != null && g.payment == "UNPAID") Text("${g.month}: ${money(g.fee)}", color = p.coral, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun NotificationsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemoteList("/api/v1/notifications/me", NotificationItem.serializer())
    RefreshColumn(listOf(remote)) {
        Hero("Xabarlar", "Bildirishnomalar", "Tortib yangilang")
        Section(remote) { list ->
            if (list.isEmpty()) EmptyText("Hozircha xabar yo'q")
            list.forEachIndexed { i, n ->
                Panel(Modifier.stagger(i).pressable {
                    if (!n.isRead) scope.launch { runCatching { api.patch("/api/v1/notifications/${n.id}/read") }; remote.reload() }
                }) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                        Column(Modifier.padding(top = 5.dp).size(9.dp).background(if (n.isRead) Color.Transparent else p.accent, CircleShape)) {}
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(n.title, color = p.ink, fontWeight = if (n.isRead) FontWeight.Medium else FontWeight.Bold, fontSize = 14.sp)
                            Text(n.body, color = p.muted, fontSize = 13.sp)
                            Text(fmtDue(n.createdAt), color = p.faint, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(user: AuthUser) {
    val p = P
    val app = LocalContext.current.applicationContext as EduGoApp
    val themeMode = LocalThemeMode.current
    val setThemeMode = LocalSetThemeMode.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var inviteBusy by remember { mutableStateOf(false) }
    var invite by remember { mutableStateOf<ParentInviteData?>(null) }
    var inviteError by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current
    RefreshColumn(emptyList()) {
        Hero(roleLabel(user.role), user.fullName, user.username?.let { "@$it" })
        Panel {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Avatar(user.firstName, size = 48.dp)
                    Column {
                        Text(user.fullName, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(roleLabel(user.role), color = p.muted, fontSize = 13.sp)
                    }
                }
                Text("Ko'rinish", color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                    listOf("system" to "Tizim", "dark" to "Qorong'i", "light" to "Yorug'").forEach { (mode, label) ->
                        val selected = themeMode == mode
                        Text(label, color = if (selected) p.base else p.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.weight(1f).background(if (selected) p.accent else p.raised, RoundedCornerShape(12.dp))
                                .pressable { setThemeMode(mode) }.padding(vertical = 10.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                }
                Text("Versiya ${BuildConfig.VERSION_NAME}", color = p.faint, fontSize = 12.sp)
                Text(BuildConfig.API_URL, color = p.faint, fontSize = 12.sp)
            }
        }
        if (user.role == "STUDENT") {
            PrimaryButton(if (inviteBusy) "Taklif yaratilmoqda…" else "Ota-onani ulash", enabled = !inviteBusy, modifier = Modifier.fillMaxWidth(), onClick = {
                inviteBusy = true; inviteError = null
                scope.launch {
                    try {
                        val raw = app.api.raw("POST", "/api/v1/parents/invite", "{}")
                        invite = AppJson.decodeFromString(ParentInviteData.serializer(), raw)
                    } catch (e: Exception) { inviteError = e.message ?: "Taklif yaratilmadi" }
                    inviteBusy = false
                }
            })
            invite?.let { data ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        SectionTitle("Ota-onaga yuboriladigan taklif")
                        Text("Kod: ${data.code}", color = p.accent, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                        Text("Taklif 7 kun amal qiladi. Ota-ona Telegramda havolani ochishi kerak.", color = p.muted, fontSize = 11.sp)
                        PrimaryButton("Telegram orqali ulashish", modifier = Modifier.fillMaxWidth(), onClick = {
                            val shareText = data.link ?: "EduGo ota-ona ulanish kodi: ${data.code}"
                            val intent = android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain").putExtra(android.content.Intent.EXTRA_TEXT, shareText)
                            context.startActivity(android.content.Intent.createChooser(intent, "Taklifni ulashish"))
                        })
                    }
                }
            }
            inviteError?.let { Text(it, color = p.coral, fontSize = 12.sp) }
        }
        PrimaryButton(
            if (busy) "Chiqilmoqda…" else "Hisobdan chiqish",
            onClick = { busy = true; scope.launch { app.api.logout() } },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}
