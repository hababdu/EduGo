package uz.edugo.mobile.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.edugo.mobile.data.SuperOrganization
import uz.edugo.mobile.data.SuperOrgDetail
import uz.edugo.mobile.data.SuperOverview
import uz.edugo.mobile.data.SuperSystemData
import uz.edugo.mobile.data.CreateSuperOrgBody
import uz.edugo.mobile.data.UpdateSuperOrgBody
import uz.edugo.mobile.data.SuperAdminCandidate
import uz.edugo.mobile.data.AssignSuperAdminBody
import uz.edugo.mobile.data.SuperRestoreResult
import uz.edugo.mobile.data.SuperOrgAdmin
import uz.edugo.mobile.data.AppJson
import kotlinx.serialization.decodeFromString

@Composable
fun SuperAdminHome(openOrganizations: () -> Unit) {
    val p = P
    val remote = rememberRemote("/api/v1/super/overview", SuperOverview.serializer())
    val system = rememberRemote("/api/v1/super/system", SuperSystemData.serializer())
    RefreshColumn(listOf(remote, system)) {
        Hero("Super admin", "Platforma boshqaruvi", "Barcha tashkilotlar va tizim holati")
        Section(system) { status ->
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    SectionTitle("Tizim holati")
                    Pill(if (status.db.ok) "Ma'lumotlar bazasi faol" else "Ma'lumotlar bazasi xatosi", if (status.db.ok) P.teal else P.coral)
                    Text("DB kechikishi: ${status.db.latencyMs} ms · Hajmi: ${status.db.sizeBytes?.div(1_048_576) ?: "—"} MB", color = P.muted, fontSize = 11.sp)
                    Text("Server: ${status.server.env} · Node ${status.server.node} · Uptime: ${status.server.uptimeSec / 3600} soat", color = P.muted, fontSize = 11.sp)
                    Text("Xotira: RSS ${status.server.rssMb} MB · Heap ${status.server.heapMb} MB", color = P.muted, fontSize = 11.sp)
                    Text("AI baholash: ${status.queue.gradingRunning} jarayonda · ${status.queue.gradingOverdue} muddati o'tgan", color = P.gold, fontSize = 11.sp)
                    Text("Tekshiruv: ${status.queue.needsReview} · Xatolik: ${status.queue.failedSubmissions} · Yetim fayl: ${status.queue.orphanFiles}", color = P.muted, fontSize = 11.sp)
                }
            }
        }
        Section(remote) { data ->
            KpiRow(listOf(
                Triple("Maktablar", data.organizations.active, p.accent),
                Triple("Foydalanuvchi", data.users.total, p.sky),
                Triple("Faol 7 kun", data.users.active7d, p.teal),
            ))
            KpiRow(listOf(
                Triple("Guruhlar", data.groups, p.gold),
                Triple("Testlar", data.tests, p.accent2),
                Triple("Fayllar", data.files.count, p.coral),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SectionTitle("Bugungi AI ishlatilishi")
                    Text("So'rovlar: ${data.aiToday.requests}", color = p.ink, fontWeight = FontWeight.SemiBold)
                    Text("Tokenlar: ${data.aiToday.tokens}", color = p.muted, fontSize = 13.sp)
                    Text("Faol bo'lmagan maktablar: ${data.organizations.suspended}", color = p.muted, fontSize = 12.sp)
                }
            }
            PrimaryButton("Maktablar ro'yxati →", onClick = openOrganizations, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun SuperOrganizations(openOrganization: (String) -> Unit) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemoteList("/api/v1/super/organizations", SuperOrganization.serializer())
    var query by remember { mutableStateOf("") }
    var creating by remember { mutableStateOf(false) }
    var orgName by remember { mutableStateOf("") }
    var storageChatId by remember { mutableStateOf("") }
    var orgNote by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val list = (remote.state as? UiState.Ready)?.value.orEmpty()
        .filter { it.name.contains(query, true) }
    RefreshColumn(listOf(remote)) {
        Hero("Super admin", "Maktablar", "Tashkilotlar holati va foydalanuvchilari")
        PrimaryButton(if (creating) "Formani yopish" else "+ Maktab yaratish", modifier = Modifier.fillMaxWidth(), onClick = { creating = !creating; message = null })
        if (creating) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Yangi maktab")
                    BasicTextField(orgName, { orgName = it }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 14.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(12.dp)).padding(12.dp), decorationBox = { inner -> if (orgName.isEmpty()) Text("Maktab nomi", color = p.faint); inner() })
                    BasicTextField(storageChatId, { storageChatId = it.filter { ch -> ch.isDigit() || ch == '-' }.take(20) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 14.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(12.dp)).padding(12.dp), decorationBox = { inner -> if (storageChatId.isEmpty()) Text("Yopiq Telegram kanal ID (-100...)", color = p.faint); inner() })
                    BasicTextField(orgNote, { orgNote = it }, singleLine = false, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(12.dp)).padding(12.dp), decorationBox = { inner -> if (orgNote.isEmpty()) Text("Izoh (ixtiyoriy)", color = p.faint); inner() })
                    Text("Botni maktabning yopiq kanaliga administrator qilib qo'shing. Kanal ID -100 bilan boshlanishi shart.", color = p.muted, fontSize = 11.sp)
                    message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
                    PrimaryButton(if (saving) "Tekshirilmoqda…" else "Maktab yaratish", enabled = !saving && orgName.trim().length >= 2 && Regex("^-100\\d{5,}$").matches(storageChatId), modifier = Modifier.fillMaxWidth(), onClick = {
                        saving = true
                        scope.launch {
                            try {
                                api.send("POST", "/api/v1/super/organizations", CreateSuperOrgBody.serializer(), CreateSuperOrgBody(orgName.trim(), storageChatId, orgNote.trim().ifBlank { null }))
                                orgName = ""; storageChatId = ""; orgNote = ""; creating = false; remote.reload()
                            } catch (e: Exception) { message = e.message ?: "Maktab yaratilmadi" }
                            saving = false
                        }
                    })
                }
            }
        }
        BasicTextField(
            value = query, onValueChange = { query = it }, singleLine = true,
            textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
            cursorBrush = SolidColor(p.accent),
            modifier = Modifier.fillMaxWidth().background(p.surface, RoundedCornerShape(15.dp))
                .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(15.dp))
                .padding(horizontal = 15.dp, vertical = 13.dp),
            decorationBox = { inner -> if (query.isEmpty()) Text("Maktab nomini qidirish…", color = p.faint); inner() },
        )
        Section(remote) {
            if (list.isEmpty()) EmptyText("Maktab topilmadi")
            list.forEachIndexed { index, org ->
                Panel(Modifier.stagger(index).pressable { openOrganization(org.id) }) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(org.name, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                            Pill(if (org.status == "ACTIVE") "Faol" else "To'xtatilgan", if (org.status == "ACTIVE") p.teal else p.coral)
                        }
                        Text("${org.users} foydalanuvchi · ${org.groups} guruh", color = p.muted, fontSize = 12.sp)
                        Text("Adminlar: ${org.admins.joinToString { it.name }.ifBlank { "Biriktirilmagan" }}", color = p.faint, fontSize = 12.sp)
                        Text("Batafsil →", color = p.accent, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun SuperOrganizationDetail(id: String, onBack: () -> Unit) {
    val p = P
    val api = LocalApi.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote("/api/v1/super/organizations/$id/detail", SuperOrgDetail.serializer())
    var candidateQuery by remember { mutableStateOf("") }
    val candidatesRemote = rememberRemoteList("/api/v1/super/users?search=$candidateQuery", SuperAdminCandidate.serializer())
    var removeAdminTarget by remember { mutableStateOf<SuperOrgAdmin?>(null) }
    var status by remember { mutableStateOf("ACTIVE") }
    var monthlyFee by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var channelId by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var restoreBusy by remember { mutableStateOf(false) }
    var restorePreview by remember { mutableStateOf<SuperRestoreResult?>(null) }
    var restoreUri by remember { mutableStateOf<Uri?>(null) }
    val restorePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) {
            restoreUri = uri
            restoreBusy = true
            scope.launch {
                try {
                    val raw = api.restoreOrganization(context, uri, id, false)
                    restorePreview = AppJson.decodeFromString(SuperRestoreResult.serializer(), raw)
                } catch (e: Exception) { message = e.message ?: "Backup tekshirilmadi" }
                restoreBusy = false
            }
        }
    }
    val current = (remote.state as? UiState.Ready)?.value
    LaunchedEffect(current?.org?.id) {
        current?.org?.let { status = it.status; monthlyFee = it.monthlyPlanFee?.toString().orEmpty(); note = it.note.orEmpty(); channelId = it.storageChatId.orEmpty() }
    }
    RefreshColumn(listOf(remote, candidatesRemote)) {
        BackHeader("Maktab tafsilotlari", onBack)
        Section(remote) { data ->
            Hero("Tashkilot", data.org.name, data.org.note)
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    SectionTitle("Maktab sozlamalari")
                    Text("Holat: $status", color = if (status == "ACTIVE") p.teal else p.coral, fontWeight = FontWeight.SemiBold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Faol", color = if (status == "ACTIVE") p.base else p.muted, modifier = Modifier.background(if (status == "ACTIVE") p.accent else p.raised, RoundedCornerShape(18.dp)).pressable { status = "ACTIVE" }.padding(9.dp))
                        Text("To'xtatish", color = if (status == "SUSPENDED") p.base else p.muted, modifier = Modifier.background(if (status == "SUSPENDED") p.coral else p.raised, RoundedCornerShape(18.dp)).pressable { status = "SUSPENDED" }.padding(9.dp))
                    }
                    BasicTextField(monthlyFee, { monthlyFee = it.filter(Char::isDigit).take(12) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(11.dp), decorationBox = { inner -> if (monthlyFee.isEmpty()) Text("Oylik obuna summasi (so'm)", color = p.faint); inner() })
                    BasicTextField(note, { note = it }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(11.dp), decorationBox = { inner -> if (note.isEmpty()) Text("Izoh", color = p.faint); inner() })
                    BasicTextField(channelId, { channelId = it.filter { ch -> ch.isDigit() || ch == '-' }.take(20) }, singleLine = true, textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent), modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(11.dp)).padding(11.dp), decorationBox = { inner -> if (channelId.isEmpty()) Text("Yopiq kanal ID (-100...)", color = p.faint); inner() })
                    Text("Oxirgi zaxira: ${data.org.lastBackupAt ?: "hali yo'q"} · ${data.org.lastBackupStatus ?: "holat yo'q"}", color = p.faint, fontSize = 10.sp)
                    message?.let { Text(it, color = if (it.startsWith("Saqlandi") || it.startsWith("Zaxira")) p.teal else p.coral, fontSize = 12.sp) }
                    PrimaryButton(if (busy) "Bajarilmoqda…" else "Sozlamalarni saqlash", enabled = !busy && monthlyFee.toLongOrNull()?.let { it <= 1_000_000_000L } != false && (channelId.isBlank() || Regex("^-100\\d{5,}$").matches(channelId)), modifier = Modifier.fillMaxWidth(), onClick = {
                        busy = true
                        scope.launch {
                            try {
                                api.send("PATCH", "/api/v1/super/organizations/$id", UpdateSuperOrgBody.serializer(), UpdateSuperOrgBody(note = note, status = status, monthlyPlanFee = monthlyFee.toLongOrNull() ?: 0L, storageChatId = channelId.ifBlank { null }))
                                remote.reload(); message = "Saqlandi"
                            } catch (e: Exception) { message = e.message ?: "Saqlanmadi" }
                            busy = false
                        }
                    })
                    PrimaryButton("Hozir zaxira yaratish", enabled = !busy && channelId.isNotBlank(), modifier = Modifier.fillMaxWidth(), onClick = {
                        busy = true
                        scope.launch {
                            try { api.raw("POST", "/api/v1/super/organizations/$id/backup", "{}"); remote.reload(); message = "Zaxira yaratildi" }
                            catch (e: Exception) { message = e.message ?: "Zaxira yaratilmadi" }
                            busy = false
                        }
                    })
                    PrimaryButton(if (restoreBusy) "Backup tekshirilmoqda…" else "Backupdan tiklash", enabled = !busy && !restoreBusy, modifier = Modifier.fillMaxWidth(), onClick = { restorePicker.launch(arrayOf("*/*")) })
                }
            }
            KpiRow(listOf(
                Triple("O'quvchilar", data.counts.students, p.accent),
                Triple("O'qituvchi", data.counts.teachers, p.sky),
                Triple("Admin", data.counts.admins, p.gold),
            ))
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    SectionTitle("To'lov holati")
                    Text("Oy: ${data.studentPayments.month}", color = p.muted, fontSize = 12.sp)
                    Text("Yig'ilgan: ${money(data.studentPayments.collected.toDouble())}", color = p.teal, fontWeight = FontWeight.Bold)
                    Text("Kutilgan: ${money(data.studentPayments.expected.toDouble())}", color = p.ink)
                    Text("To'lov qilganlar: ${data.studentPayments.paidCount}", color = p.muted, fontSize = 12.sp)
                    Pill("Obuna: ${data.subscription.state}", if (data.subscription.state == "PAID") p.teal else p.gold)
                }
            }
            SectionTitle("Adminlar · ${data.admins.size}")
            data.admins.forEach { admin ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${admin.name}${admin.username?.let { " · @$it" } ?: ""}", color = p.ink, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    Text("Olib tashlash", color = p.coral, fontSize = 10.sp, modifier = Modifier.pressable { removeAdminTarget = admin }.padding(4.dp))
                }
            }
            SectionTitle("Admin biriktirish")
            BasicTextField(candidateQuery, { candidateQuery = it }, singleLine = true,
                textStyle = TextStyle(color = p.ink, fontSize = 12.sp), cursorBrush = SolidColor(p.accent),
                modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(10.dp),
                decorationBox = { inner -> if (candidateQuery.isEmpty()) Text("Foydalanuvchini qidirish", color = p.faint); inner() },
            )
            val currentAdminIds = data.admins.map { it.id }.toSet()
            val candidates = (candidatesRemote.state as? UiState.Ready)?.value.orEmpty().filter { it.id !in currentAdminIds }
            if (candidates.isEmpty()) Text("Adminlikka nomzod topilmadi", color = p.faint, fontSize = 11.sp)
            candidates.take(8).forEach { candidate ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(candidate.name, color = p.ink, fontSize = 12.sp)
                        Text("${candidate.role}${candidate.organization?.let { " · ${it.name}" } ?: ""}", color = p.faint, fontSize = 10.sp)
                    }
                    Text("Biriktirish", color = p.accent, fontSize = 10.sp, modifier = Modifier.pressable {
                        if (!busy) {
                            busy = true
                            scope.launch {
                                try {
                                    api.send("POST", "/api/v1/super/organizations/$id/admins", AssignSuperAdminBody.serializer(), AssignSuperAdminBody(candidate.id))
                                    remote.reload(); candidatesRemote.reload(); message = "Admin biriktirildi"
                                } catch (e: Exception) { message = e.message ?: "Admin biriktirilmadi" }
                                busy = false
                            }
                        }
                    }.padding(5.dp))
                }
            }
            SectionTitle("O'qituvchilar · ${data.teachers.size}")
            data.teachers.forEach { teacher -> Text("${teacher.name}${teacher.username?.let { " · @$it" } ?: ""}", color = p.muted, fontSize = 12.sp) }
            SectionTitle("Guruhlar · ${data.groups.size}")
            if (data.groups.isEmpty()) EmptyText("Guruhlar mavjud emas")
            data.groups.forEach { group ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(group.name, color = p.ink, fontWeight = FontWeight.SemiBold)
                        Text("${group.members} o'quvchi · ${group.teacher ?: "O'qituvchi biriktirilmagan"}", color = p.muted, fontSize = 12.sp)
                    }
                }
            }
        }
    }
    removeAdminTarget?.let { admin ->
        AlertDialog(
            onDismissRequest = { removeAdminTarget = null },
            title = { Text("Adminlikdan chiqarilsinmi?") },
            text = { Text("${admin.name} admin rolidan chiqariladi va o'qituvchi bo'lib qoladi.") },
            confirmButton = { TextButton(onClick = {
                removeAdminTarget = null
                scope.launch {
                    runCatching { api.raw("DELETE", "/api/v1/super/organizations/$id/admins/${admin.id}", "{}"); remote.reload() }
                        .onFailure { message = it.message ?: "Admin olib tashlanmadi" }
                }
            }) { Text("Chiqarish") } },
            dismissButton = { TextButton(onClick = { removeAdminTarget = null }) { Text("Bekor qilish") } },
        )
    }
    restorePreview?.let { preview ->
        AlertDialog(
            onDismissRequest = { restorePreview = null; restoreUri = null },
            title = { Text("Backupni tiklashni tasdiqlaysizmi?") },
            text = { Text("Backup sanasi: ${preview.backupCreatedAt ?: "noma'lum"}\nGuruhlar: ${preview.toRestore.groups}\nA'zolar: ${preview.toRestore.members}\nTo'lovlar: ${preview.toRestore.payments}\nDavomat: ${preview.toRestore.attendance}\n\nAvvalgi ma'lumotlar bilan birlashtirish amali bajariladi.") },
            confirmButton = { TextButton(enabled = !restoreBusy, onClick = {
                val uri = restoreUri
                if (uri != null) {
                    restoreBusy = true
                    restorePreview = null
                    scope.launch {
                        try {
                            api.restoreOrganization(context, uri, id, true)
                            remote.reload()
                            message = "Zaxira tiklandi"
                        } catch (e: Exception) { message = e.message ?: "Tiklash bajarilmadi" }
                        restoreBusy = false
                        restoreUri = null
                    }
                }
            }) { Text("Tiklash") } },
            dismissButton = { TextButton(onClick = { restorePreview = null; restoreUri = null }) { Text("Bekor qilish") } },
        )
    }
}
