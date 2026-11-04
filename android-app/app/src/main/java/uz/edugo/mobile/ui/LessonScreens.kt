package uz.edugo.mobile.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.LessonItem

private val lessonFilters = listOf("BARCHA", "LESSON", "HOMEWORK", "RESOURCE")

private fun lessonCategoryLabel(value: String) = when (value) {
    "HOMEWORK" -> "Uy vazifasi"
    "RESOURCE" -> "Qo'shimcha material"
    else -> "Dars mavzusi"
}

private fun lessonTypeLabel(value: String) = when (value) {
    "IMAGE" -> "Rasm"
    "PDF" -> "PDF hujjat"
    "VIDEO" -> "Video"
    "FILE" -> "Fayl"
    else -> "Matn"
}

@Composable
fun StudentLessons(openLesson: (String) -> Unit) {
    val p = P
    val remote = rememberRemoteList("/api/v1/dashboard/assignments", LessonItem.serializer())
    var search by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("BARCHA") }
    val items = (remote.state as? UiState.Ready)?.value.orEmpty()
    val filtered = items.filter { item ->
        (filter == "BARCHA" || item.category == filter) &&
            (search.isBlank() || item.title.contains(search, true) ||
                item.group?.name.orEmpty().contains(search, true))
    }

    RefreshColumn(listOf(remote)) {
        Hero("O'quv materiallari", "Darslarim", "Dars, uy vazifasi va qo'shimcha resurslar")
        BasicTextField(
            value = search,
            onValueChange = { search = it },
            singleLine = true,
            textStyle = TextStyle(color = p.ink, fontSize = 15.sp),
            cursorBrush = SolidColor(p.accent),
            modifier = Modifier.fillMaxWidth()
                .background(p.surface, RoundedCornerShape(16.dp))
                .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                .padding(horizontal = 16.dp, vertical = 14.dp),
            decorationBox = { inner ->
                if (search.isEmpty()) Text("Dars yoki guruhni qidirish…", color = p.faint, fontSize = 14.sp)
                inner()
            },
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            lessonFilters.forEach { key ->
                val selected = filter == key
                val label = when (key) {
                    "BARCHA" -> "Barchasi"
                    "HOMEWORK" -> "Vazifalar"
                    "RESOURCE" -> "Resurslar"
                    else -> "Darslar"
                }
                Text(
                    label,
                    color = if (selected) p.base else p.muted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(if (selected) p.accent else p.surface, RoundedCornerShape(50))
                        .pressable { filter = key }
                        .padding(horizontal = 11.dp, vertical = 9.dp),
                )
            }
        }
        Section(remote) {
            if (filtered.isEmpty()) {
                EmptyText(if (items.isEmpty()) "Hozircha material biriktirilmagan" else "Qidiruv bo'yicha material topilmadi")
            } else {
                SectionTitle("Materiallar · ${filtered.size}")
                filtered.forEachIndexed { index, item ->
                    Panel(Modifier.stagger(index).pressable { openLesson(item.id) }) {
                        Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Pill(lessonCategoryLabel(item.category), when (item.category) {
                                    "HOMEWORK" -> p.coral
                                    "RESOURCE" -> p.sky
                                    else -> p.gold
                                })
                                Pill(lessonTypeLabel(item.type), p.muted)
                            }
                            Text(item.title, color = p.ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                            Text(
                                listOfNotNull(item.group?.name, item.teacher?.let { teacher ->
                                    listOfNotNull(teacher.firstName, teacher.lastName).joinToString(" ").ifBlank { teacher.username.orEmpty() }
                                }).filter { it.isNotBlank() }.joinToString(" · ").ifBlank { "EduGo materiali" },
                                color = p.muted, fontSize = 12.sp,
                            )
                            if (!item.dueAt.isNullOrBlank()) Text("Muddat: ${fmtDue(item.dueAt)}", color = p.gold, fontSize = 12.sp)
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("${item.files.size} ta fayl · ${item.tests.size} ta savol", color = p.faint, fontSize = 11.sp)
                                Text("Ochish →", color = p.accent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StudentLessonDetail(id: String, onBack: () -> Unit, openHomework: (String) -> Unit) {
    val p = P
    val context = LocalContext.current
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val scope = rememberCoroutineScope()
    var sendingFile by remember { mutableStateOf<String?>(null) }
    var openingFile by remember { mutableStateOf<String?>(null) }
    var fileMessage by remember { mutableStateOf<String?>(null) }
    val remote = rememberRemote("/api/v1/dashboard/assignments/$id", LessonItem.serializer())
    RefreshColumn(listOf(remote)) {
        BackHeader("Material") { onBack() }
        Section(remote) { item ->
            Hero(lessonCategoryLabel(item.category), item.title, item.group?.name)
            if (!item.dueAt.isNullOrBlank()) {
                Panel { Text("Topshirish muddati: ${fmtDue(item.dueAt)}", color = p.gold, fontWeight = FontWeight.SemiBold) }
            }
            item.teacher?.let { teacher ->
                val name = listOfNotNull(teacher.firstName, teacher.lastName).joinToString(" ").ifBlank { teacher.username.orEmpty() }
                if (name.isNotBlank()) Text("O'qituvchi: $name", color = p.muted, fontSize = 13.sp)
            }
            item.description?.takeIf { it.isNotBlank() }?.let { description ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle("Tafsilotlar")
                        Text(description, color = p.ink, fontSize = 14.sp, lineHeight = 21.sp)
                    }
                }
            }
            item.mediaUrl?.takeIf { it.startsWith("https://", true) }?.let { url ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${lessonTypeLabel(item.type)} havolasi", color = p.ink, fontWeight = FontWeight.SemiBold)
                        PrimaryButton(
                            "Havolani ochish ↗",
                            modifier = Modifier.fillMaxWidth(),
                            onClick = {
                                runCatching {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                }
                            },
                        )
                    }
                }
            }
            if (item.files.isNotEmpty()) {
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionTitle("Biriktirilgan fayllar · ${item.files.size}")
                        item.files.forEach { file ->
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text("📎 ${file.fileName.ifBlank { "Fayl" }}", color = p.ink, fontSize = 13.sp)
                                        Text("${file.kind} · ${file.sizeBytes / 1024} KB", color = p.faint, fontSize = 11.sp)
                                    }
                                    Text(
                                        if (openingFile == file.id) "Ochilmoqda…" else "Ochish / yuklab olish",
                                        color = p.accent,
                                        fontSize = 10.sp,
                                        modifier = Modifier.pressable {
                                            if (openingFile == null) {
                                                openingFile = file.id
                                                fileMessage = null
                                                scope.launch {
                                                    fileMessage = runCatching {
                                                        val uri = api.materialFileUri(context, file.id, file.fileName, file.mimeType)
                                                        val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, file.mimeType)
                                                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                                                        context.startActivity(Intent.createChooser(intent, "Faylni ochish"))
                                                        "Fayl ochish uchun ilova tanlandi"
                                                    }.getOrElse { it.message ?: "Faylni ochib bo'lmadi" }
                                                    openingFile = null
                                                }
                                            }
                                        }.padding(start = 8.dp, top = 5.dp, bottom = 5.dp),
                                    )
                                }
                                Text(
                                    if (sendingFile == file.id) "Telegramga yuborilmoqda…" else "Telegramga yuborish",
                                    color = p.muted,
                                    fontSize = 10.sp,
                                    modifier = Modifier.pressable {
                                        if (sendingFile == null) {
                                            sendingFile = file.id
                                            fileMessage = null
                                            scope.launch {
                                                fileMessage = runCatching {
                                                    api.raw("POST", "/api/v1/materials/files/${file.id}/send-to-chat", "{}")
                                                    "Fayl Telegram chatga yuborildi"
                                                }.getOrElse { it.message ?: "Faylni yuborib bo'lmadi" }
                                                sendingFile = null
                                            }
                                        }
                                    }.padding(vertical = 3.dp),
                                )
                            }
                        }
                        fileMessage?.let { Text(it, color = if (it.startsWith("Fayl Telegram")) p.teal else p.coral, fontSize = 11.sp) }
                    }
                }
            }
            if (item.tests.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionTitle("Mavzu savollari · ${item.tests.size}")
                    item.tests.sortedBy { it.order }.forEachIndexed { index, test ->
                        Panel {
                            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Text("${index + 1}. ${test.question}", color = p.ink, fontWeight = FontWeight.SemiBold)
                                test.options.forEachIndexed { optionIndex, option ->
                                    Text("${'A' + optionIndex}. $option", color = p.muted, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }
            if (item.category == "HOMEWORK") {
                PrimaryButton(
                    "Vazifani topshirish",
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { openHomework(item.id) },
                )
            }
            if (item.description.isNullOrBlank() && item.mediaUrl.isNullOrBlank() && item.files.isEmpty() && item.tests.isEmpty()) {
                EmptyText("Bu materialga hali kontent qo'shilmagan")
            }
        }
    }
}
