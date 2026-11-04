package uz.edugo.mobile.ui

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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.CreateTeacherMaterial
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.TeacherMaterialItem

@Composable
fun TeacherMaterialsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val materials = rememberRemoteList("/api/v1/teacher/assignments", TeacherMaterialItem.serializer())
    val groups = rememberRemoteList("/api/v1/teacher/groups", GroupItem.serializer())
    var creating by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var mediaUrl by remember { mutableStateOf("") }
    var groupId by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("LESSON") }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val groupList = (groups.state as? UiState.Ready)?.value.orEmpty()
    val list = (materials.state as? UiState.Ready)?.value.orEmpty()

    RefreshColumn(listOf(materials, groups)) {
        Hero("O'qituvchi", "Materiallar", "Dars, uy vazifasi va resurslarni guruhlarga joylang")
        PrimaryButton(if (creating) "Yopish" else "+ Material yaratish", modifier = Modifier.fillMaxWidth(), onClick = { creating = !creating; message = null })
        if (creating) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionTitle("Yangi material")
                    MaterialField(title, { title = it }, "Material nomi")
                    MaterialField(description, { description = it }, "Izoh (ixtiyoriy)")
                    MaterialField(mediaUrl, { mediaUrl = it }, "HTTPS/HTTP havola (ixtiyoriy)")
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
                    Text("Tur", color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf("LESSON" to "Dars", "HOMEWORK" to "Vazifa", "RESOURCE" to "Resurs").forEach { (key, label) ->
                            val selected = category == key
                            Text(label, color = if (selected) p.base else p.muted, fontSize = 12.sp,
                                modifier = Modifier.background(if (selected) p.accent else p.raised, RoundedCornerShape(30.dp))
                                    .pressable { category = key }.padding(horizontal = 12.dp, vertical = 9.dp))
                        }
                    }
                    message?.let { Text(it, color = if (it.startsWith("Saqlandi")) p.teal else p.coral, fontSize = 12.sp) }
                    PrimaryButton(
                        if (saving) "Saqlanmoqda…" else "E'lon qilish",
                        enabled = !saving && title.isNotBlank() && groupId.isNotBlank() && (category == "LESSON" || description.isNotBlank() || mediaUrl.isNotBlank()),
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            saving = true; message = null
                            scope.launch {
                                message = try {
                                    val body = CreateTeacherMaterial(
                                        title = title.trim(),
                                        description = description.trim().ifBlank { null },
                                        mediaUrl = mediaUrl.trim().ifBlank { null },
                                        groupId = groupId,
                                        category = category,
                                        type = if (mediaUrl.isBlank()) "TEXT" else "VIDEO",
                                        status = "PUBLISHED",
                                    )
                                    api.send("POST", "/api/v1/teacher/assignments", CreateTeacherMaterial.serializer(), body)
                                    materials.reload()
                                    creating = false
                                    title = ""; description = ""; mediaUrl = ""; groupId = ""
                                    "Saqlandi va guruhga e'lon qilindi"
                                } catch (e: ApiException) { e.message ?: "Saqlab bo'lmadi" }
                                saving = false
                            }
                        },
                    )
                }
            }
        }
        Section(materials) {
            SectionTitle("Joylangan materiallar · ${list.size}")
            if (list.isEmpty()) EmptyText("Hozircha material yo'q")
            list.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.title, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(if (item.status == "PUBLISHED") "E'lon qilingan" else "Qoralama", if (item.status == "PUBLISHED") p.teal else p.gold)
                        }
                        Text("${item.group?.name ?: "Guruh"} · ${item.category}", color = p.muted, fontSize = 12.sp)
                        Text("Ko'rilgan: ${item.stats?.viewed ?: 0}/${item.stats?.total ?: 0} · Fayllar: ${item.files.size}", color = p.faint, fontSize = 11.sp)
                        item.dueAt?.let { Text("Muddat: ${fmtDue(it)}", color = p.gold, fontSize = 12.sp) }
                    }
                }
            }
        }
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
