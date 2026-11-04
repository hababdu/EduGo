package uz.edugo.mobile.ui

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.CreateTeacherMaterial
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.MaterialFileDto
import uz.edugo.mobile.data.TeacherMaterialItem
import uz.edugo.mobile.data.UpdateTeacherMaterial

@Composable
fun TeacherMaterialsScreen() {
    val p = P
    val api = LocalApi.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val materials = rememberRemoteList("/api/v1/teacher/assignments", TeacherMaterialItem.serializer())
    val groups = rememberRemoteList("/api/v1/teacher/groups", GroupItem.serializer())
    var editingId by remember { mutableStateOf<String?>(null) }
    var formOpen by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var mediaUrl by remember { mutableStateOf("") }
    var groupId by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("LESSON") }
    var files by remember { mutableStateOf<List<MaterialFileDto>>(emptyList()) }
    var saving by remember { mutableStateOf(false) }
    var uploading by remember { mutableStateOf(false) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var deleteTarget by remember { mutableStateOf<TeacherMaterialItem?>(null) }
    val groupList = (groups.state as? UiState.Ready)?.value.orEmpty()
    val list = (materials.state as? UiState.Ready)?.value.orEmpty()
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) scope.launch {
            uploading = true
            message = null
            try {
                val file = api.uploadMaterial(context, uri)
                files = files + file
                message = "Fayl yuklandi: ${file.fileName}"
            } catch (e: Exception) {
                message = e.message ?: "Fayl yuklanmadi"
            } finally { uploading = false }
        }
    }

    fun startEdit(item: TeacherMaterialItem?) {
        formOpen = true
        editingId = item?.id
        title = item?.title.orEmpty()
        description = item?.description.orEmpty()
        mediaUrl = item?.mediaUrl.orEmpty()
        groupId = item?.groupId.orEmpty()
        category = item?.category ?: "LESSON"
        files = item?.files.orEmpty()
        message = null
    }
    fun save() {
        if (title.isBlank() || groupId.isBlank() || saving || uploading) return
        saving = true
        message = null
        scope.launch {
            try {
                val type = files.firstOrNull()?.kind ?: if (mediaUrl.isBlank()) "TEXT" else "VIDEO"
                if (editingId == null) {
                    val body = CreateTeacherMaterial(
                        title = title.trim(),
                        description = description.trim().ifBlank { null },
                        mediaUrl = mediaUrl.trim().ifBlank { null },
                        groupId = groupId,
                        category = category,
                        type = type,
                        fileIds = files.map { it.id },
                        status = "PUBLISHED",
                    )
                    api.send("POST", "/api/v1/teacher/assignments", CreateTeacherMaterial.serializer(), body)
                } else {
                    val body = UpdateTeacherMaterial(
                        title = title.trim(),
                        description = description.trim(),
                        mediaUrl = mediaUrl.trim(),
                        groupId = groupId,
                        category = category,
                        type = type,
                        fileIds = files.map { it.id },
                    )
                    api.send("PATCH", "/api/v1/teacher/assignments/$editingId", UpdateTeacherMaterial.serializer(), body)
                }
                materials.reload()
                editingId = null
                formOpen = false
                title = ""; description = ""; mediaUrl = ""; groupId = ""; files = emptyList()
                message = "Saqlandi"
            } catch (e: Exception) {
                message = e.message ?: "Saqlab bo'lmadi"
            } finally { saving = false }
        }
    }

    RefreshColumn(listOf(materials, groups)) {
        Hero("O'qituvchi", "Materiallar", "Dars, vazifa va resurslarni yaratish hamda boshqarish")
        if (formOpen) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionTitle(if (editingId == null) "Yangi material" else "Materialni tahrirlash")
                    MaterialField(title, { title = it }, "Material nomi")
                    MaterialField(description, { description = it }, "Izoh va ko'rsatmalar")
                    MaterialField(mediaUrl, { mediaUrl = it }, "Video/havola (ixtiyoriy)")
                    Text("Guruh", color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    groupList.forEach { group ->
                        val selected = groupId == group.id
                        Text(
                            "${if (selected) "●" else "○"}  ${group.name}",
                            color = if (selected) p.accent else p.muted,
                            fontSize = 13.sp,
                            modifier = Modifier.fillMaxWidth().pressable { groupId = group.id }.padding(vertical = 5.dp),
                        )
                    }
                    Text("Toifa", color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf("LESSON" to "Dars", "HOMEWORK" to "Uy vazifasi", "RESOURCE" to "Resurs").forEach { (key, label) ->
                            val selected = category == key
                            Text(label, color = if (selected) p.base else p.muted, fontSize = 12.sp,
                                modifier = Modifier.background(if (selected) p.accent else p.raised, RoundedCornerShape(30.dp))
                                    .pressable { category = key }.padding(horizontal = 12.dp, vertical = 9.dp))
                        }
                    }
                    SectionTitle("Fayllar · ${files.size}/10")
                    files.forEach { file ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("📎 ${file.fileName} · ${file.sizeBytes / 1024} KB", color = p.ink, fontSize = 12.sp, modifier = Modifier.weight(1f))
                            Text("Olib tashlash", color = p.coral, fontSize = 11.sp, modifier = Modifier.pressable { files = files.filterNot { it.id == file.id } })
                        }
                    }
                    PrimaryButton(if (uploading) "Fayl yuklanmoqda…" else "+ Fayl biriktirish", enabled = !uploading && files.size < 10, modifier = Modifier.fillMaxWidth(), onClick = { picker.launch(arrayOf("*/*")) })
                    message?.let { Text(it, color = if (it == "Saqlandi" || it.startsWith("Fayl yuklandi")) p.teal else p.coral, fontSize = 12.sp) }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PrimaryButton("Bekor qilish", onClick = { formOpen = false; editingId = null; title = ""; description = ""; mediaUrl = ""; groupId = ""; files = emptyList(); message = null }, modifier = Modifier.weight(1f))
                        PrimaryButton(if (saving) "Saqlanmoqda…" else "Saqlash", enabled = !saving && !uploading && title.isNotBlank() && groupId.isNotBlank(), onClick = { save() }, modifier = Modifier.weight(1f))
                    }
                }
            }
        } else {
            PrimaryButton("+ Material yaratish", modifier = Modifier.fillMaxWidth(), onClick = { startEdit(null) })
        }

        Section(materials) {
            SectionTitle("Materiallar · ${list.size}")
            if (list.isEmpty()) EmptyText("Hozircha material yo'q")
            list.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.title, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(if (item.status == "PUBLISHED") "E'lon qilingan" else "Qoralama", if (item.status == "PUBLISHED") p.teal else p.gold)
                        }
                        Text("${item.group?.name ?: "Guruh"} · ${item.category}", color = p.muted, fontSize = 12.sp)
                        Text("Ko'rilgan: ${item.stats?.viewed ?: 0}/${item.stats?.total ?: 0} · Fayllar: ${item.files.size}", color = p.faint, fontSize = 11.sp)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("Tahrirlash", color = p.accent, fontSize = 12.sp, modifier = Modifier.pressable { startEdit(item) }.padding(vertical = 6.dp))
                            Text(if (item.status == "PUBLISHED") "Yashirish" else "E'lon qilish", color = p.gold, fontSize = 12.sp, modifier = Modifier.pressable {
                                busyId = item.id
                                scope.launch {
                                    runCatching {
                                        api.send("PATCH", "/api/v1/teacher/assignments/${item.id}", UpdateTeacherMaterial.serializer(), UpdateTeacherMaterial(status = if (item.status == "PUBLISHED") "DRAFT" else "PUBLISHED"))
                                        materials.reload()
                                    }.onFailure { message = it.message ?: "Holat o'zgarmadi" }
                                    busyId = null
                                }
                            }.padding(vertical = 6.dp))
                            Text("O'chirish", color = p.coral, fontSize = 12.sp, modifier = Modifier.pressable { deleteTarget = item }.padding(vertical = 6.dp))
                        }
                        if (busyId == item.id) Text("Yangilanmoqda…", color = p.faint, fontSize = 11.sp)
                    }
                }
            }
        }
    }
    deleteTarget?.let { item ->
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Material o'chirilsinmi?") },
            text = { Text("${item.title} materialini o'chirishni tasdiqlang.") },
            confirmButton = { TextButton(onClick = {
                val target = item
                deleteTarget = null
                scope.launch {
                    runCatching { api.raw("DELETE", "/api/v1/teacher/assignments/${target.id}"); materials.reload() }
                        .onFailure { message = it.message ?: "O'chirib bo'lmadi" }
                }
            }) { Text("O'chirish") } },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Bekor qilish") } },
        )
    }
}

@Composable
private fun MaterialField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    val p = P
    BasicTextField(
        value = value, onValueChange = onValueChange,
        textStyle = TextStyle(color = p.ink, fontSize = 14.sp),
        cursorBrush = SolidColor(p.accent),
        modifier = Modifier.fillMaxWidth().background(p.raised.copy(alpha = 0.5f), RoundedCornerShape(13.dp))
            .padding(horizontal = 13.dp, vertical = 12.dp),
        decorationBox = { inner ->
            if (value.isEmpty()) Text(placeholder, color = p.faint, fontSize = 13.sp)
            inner()
        },
    )
}
