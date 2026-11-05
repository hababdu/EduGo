package uz.edugo.mobile.ui

import androidx.compose.foundation.background
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
import uz.edugo.mobile.data.LessonLogItem
import uz.edugo.mobile.data.UpsertLessonLogBody
import java.time.LocalDate

@Composable
fun GroupLessonLogPanel(groupId: String, canEdit: Boolean = true) {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val logs = rememberRemoteList("/api/v1/groups/$groupId/lesson-log?limit=30", LessonLogItem.serializer())
    var date by remember { mutableStateOf(todayTashkent()) }
    var topic by remember { mutableStateOf("") }
    var homework by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    val validDate = runCatching { LocalDate.parse(date) }.isSuccess
    RefreshColumn(listOf(logs)) {
        if (canEdit) Panel {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SectionTitle("Dars jurnali")
                BasicTextField(date, { date = it.take(10) }, singleLine = true,
                    textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                    modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp),
                    decorationBox = { inner -> if (date.isEmpty()) Text("Sana YYYY-MM-DD", color = p.faint); inner() })
                BasicTextField(topic, { topic = it.take(300) }, singleLine = false,
                    textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                    modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp),
                    decorationBox = { inner -> if (topic.isEmpty()) Text("Bugun o'tilgan mavzu", color = p.faint); inner() })
                BasicTextField(homework, { homework = it.take(1000) }, singleLine = false,
                    textStyle = TextStyle(color = p.ink, fontSize = 13.sp), cursorBrush = SolidColor(p.accent),
                    modifier = Modifier.fillMaxWidth().background(p.raised, RoundedCornerShape(10.dp)).padding(11.dp),
                    decorationBox = { inner -> if (homework.isEmpty()) Text("Uyga vazifa (ixtiyoriy)", color = p.faint); inner() })
                if (!validDate) Text("Sanani YYYY-MM-DD formatida kiriting.", color = p.coral, fontSize = 11.sp)
                PrimaryButton(if (saving) "Saqlanmoqda…" else "Jurnalga yozish", enabled = !saving && validDate && topic.trim().length >= 2,
                    modifier = Modifier.fillMaxWidth(), onClick = {
                        saving = true; message = null
                        scope.launch {
                            runCatching {
                                api.send("PUT", "/api/v1/groups/$groupId/lesson-log", UpsertLessonLogBody.serializer(),
                                    UpsertLessonLogBody(date, topic.trim(), homework.trim().ifBlank { null }))
                                topic = ""; homework = ""; logs.reload(); message = "Dars jurnali saqlandi"
                            }.onFailure { message = it.message ?: "Jurnal saqlanmadi" }
                            saving = false
                        }
                    })
                message?.let { Text(it, color = if (it.startsWith("Dars jurnali")) p.teal else p.coral, fontSize = 11.sp) }
            }
        }
        Section(logs) { items ->
            SectionTitle("Oldingi darslar · ${items.size}")
            if (items.isEmpty()) EmptyText("Dars jurnali hali to'ldirilmagan")
            items.forEachIndexed { index, item ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(fmtDay(item.date), color = p.faint, fontSize = 10.sp)
                        Text(item.topic, color = p.ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        item.homework?.takeIf { it.isNotBlank() }?.let { Text("Uyga vazifa: $it", color = p.gold, fontSize = 11.sp) }
                        if (canEdit) Text("Tahrirlash", color = p.accent, fontSize = 11.sp, modifier = Modifier.pressable {
                            date = item.date; topic = item.topic; homework = item.homework.orEmpty()
                        }.padding(vertical = 5.dp))
                    }
                }
            }
        }
    }
}
