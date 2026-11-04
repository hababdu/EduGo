package uz.edugo.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
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
import uz.edugo.mobile.data.CreateTeacherTest
import uz.edugo.mobile.data.GroupItem
import uz.edugo.mobile.data.TeacherQuestionDraft
import uz.edugo.mobile.data.TeacherTestItem

private data class TestQuestionForm(
    val text: String = "",
    val optionA: String = "",
    val optionB: String = "",
    val correct: Int = 0,
)

@Composable
fun TeacherTestsScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val tests = rememberRemoteList("/api/v1/tests", TeacherTestItem.serializer())
    val groups = rememberRemoteList("/api/v1/teacher/groups", GroupItem.serializer())
    var creating by remember { mutableStateOf(false) }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("1800") }
    var passing by remember { mutableStateOf("50") }
    var selectedGroups by remember { mutableStateOf(setOf<String>()) }
    var questions by remember { mutableStateOf(listOf(TestQuestionForm())) }
    var saving by remember { mutableStateOf(false) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val groupList = (groups.state as? UiState.Ready)?.value.orEmpty()
    val testList = (tests.state as? UiState.Ready)?.value.orEmpty()

    fun reset() {
        creating = false
        title = ""; description = ""; duration = "1800"; passing = "50"
        selectedGroups = emptySet(); questions = listOf(TestQuestionForm()); message = null
    }

    RefreshColumn(listOf(tests, groups)) {
        Hero("O'qituvchi", "Testlar", "Test yarating, guruhga biriktiring va natijalarni boshqaring")
        PrimaryButton(if (creating) "Formani yopish" else "+ Test yaratish", modifier = Modifier.fillMaxWidth(), onClick = { creating = !creating; message = null })
        if (creating) {
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionTitle("Test ma'lumotlari")
                    TeacherTestField(title, { title = it }, "Test nomi")
                    TeacherTestField(description, { description = it }, "Tavsif (ixtiyoriy)")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TeacherTestField(duration, { duration = it.filter(Char::isDigit).take(5) }, "Davomiylik (soniya)", Modifier.weight(1f))
                        TeacherTestField(passing, { passing = it.filter(Char::isDigit).take(3) }, "O'tish bali (%)", Modifier.weight(1f))
                    }
                    SectionTitle("Guruhlar · ${selectedGroups.size} tanlandi")
                    if (groupList.isEmpty()) EmptyText("Sizga biriktirilgan guruh topilmadi")
                    groupList.forEach { group ->
                        val selected = group.id in selectedGroups
                        Text("${if (selected) "☑" else "□"}  ${group.name}", color = if (selected) p.accent else p.ink,
                            fontSize = 13.sp, modifier = Modifier.fillMaxWidth().pressable {
                                selectedGroups = if (selected) selectedGroups - group.id else selectedGroups + group.id
                            }.padding(vertical = 5.dp))
                    }
                    SectionTitle("Savollar · ${questions.size}")
                    questions.forEachIndexed { index, q ->
                        Panel {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Savol ${index + 1}", color = p.ink, fontWeight = FontWeight.SemiBold)
                                    if (questions.size > 1) Text("O'chirish", color = p.coral, fontSize = 12.sp, modifier = Modifier.pressable {
                                        questions = questions.filterIndexed { i, _ -> i != index }
                                    })
                                }
                                TeacherTestField(q.text, { value -> questions = questions.mapIndexed { i, old -> if (i == index) old.copy(text = value) else old } }, "Savol matni")
                                TeacherTestField(q.optionA, { value -> questions = questions.mapIndexed { i, old -> if (i == index) old.copy(optionA = value) else old } }, "A varianti")
                                TeacherTestField(q.optionB, { value -> questions = questions.mapIndexed { i, old -> if (i == index) old.copy(optionB = value) else old } }, "B varianti")
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf("A to'g'ri" to 0, "B to'g'ri" to 1).forEach { (label, answer) ->
                                        val on = q.correct == answer
                                        Text(label, color = if (on) p.base else p.muted, fontSize = 12.sp,
                                            modifier = Modifier.background(if (on) p.accent else p.raised, RoundedCornerShape(20.dp))
                                                .pressable { questions = questions.mapIndexed { i, old -> if (i == index) old.copy(correct = answer) else old } }
                                                .padding(horizontal = 12.dp, vertical = 8.dp))
                                    }
                                }
                            }
                        }
                    }
                    Text("+ Savol qo'shish", color = p.accent, fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.pressable { if (questions.size < 100) questions = questions + TestQuestionForm() }.padding(8.dp))
                    message?.let { Text(it, color = p.coral, fontSize = 12.sp) }
                    PrimaryButton(
                        if (saving) "Yaratilmoqda…" else "Test yaratish va guruhlarga biriktirish",
                        enabled = !saving && title.isNotBlank() && duration.toIntOrNull()?.let { it in 10..21600 } == true &&
                            passing.toIntOrNull()?.let { it in 1..100 } == true && selectedGroups.isNotEmpty() &&
                            questions.isNotEmpty() && questions.all { it.text.isNotBlank() && it.optionA.isNotBlank() && it.optionB.isNotBlank() },
                        modifier = Modifier.fillMaxWidth(),
                        onClick = {
                            saving = true; message = null
                            scope.launch {
                                try {
                                    val body = CreateTeacherTest(
                                        title = title.trim(),
                                        description = description.trim().ifBlank { null },
                                        durationSeconds = duration.toInt(),
                                        passingScore = passing.toInt(),
                                        groupIds = selectedGroups.toList(),
                                        questions = questions.map { TeacherQuestionDraft(it.text.trim(), options = listOf(it.optionA.trim(), it.optionB.trim()), correctAnswerIndex = it.correct) },
                                    )
                                    api.send("POST", "/api/v1/tests", CreateTeacherTest.serializer(), body)
                                    tests.reload()
                                    reset()
                                } catch (e: Exception) { message = e.message ?: "Test yaratilmadi" }
                                saving = false
                            }
                        },
                    )
                }
            }
        }
        Section(tests) {
            SectionTitle("Mavjud testlar · ${testList.size}")
            if (testList.isEmpty()) EmptyText("Hozircha test yaratilmagan")
            testList.forEachIndexed { index, test ->
                Panel(Modifier.stagger(index)) {
                    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(test.title, color = p.ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Pill(test.status, if (test.status == "PUBLISHED") p.teal else p.gold)
                        }
                        Text("${test.count?.questions ?: 0} savol · ${test.durationSeconds / 60} daqiqa · ${test.count?.attempts ?: 0} urinish", color = p.muted, fontSize = 12.sp)
                        if (test.status != "PUBLISHED") {
                            Text(if (busyId == test.id) "E'lon qilinmoqda…" else "Testni e'lon qilish", color = p.accent, fontSize = 12.sp,
                                modifier = Modifier.pressable {
                                    if (busyId == null) {
                                        busyId = test.id
                                        scope.launch {
                                            runCatching { api.patch("/api/v1/tests/${test.id}/publish"); tests.reload() }
                                                .onFailure { message = it.message ?: "Testni e'lon qilib bo'lmadi" }
                                            busyId = null
                                        }
                                    }
                                }.padding(vertical = 6.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TeacherTestField(value: String, onValueChange: (String) -> Unit, placeholder: String, modifier: Modifier = Modifier) {
    val p = P
    BasicTextField(
        value = value, onValueChange = onValueChange, singleLine = placeholder != "Savol matni",
        textStyle = TextStyle(color = p.ink, fontSize = 14.sp), cursorBrush = SolidColor(p.accent),
        modifier = modifier.fillMaxWidth().background(p.raised.copy(alpha = 0.5f), RoundedCornerShape(13.dp))
            .padding(horizontal = 13.dp, vertical = 12.dp),
        decorationBox = { inner -> if (value.isEmpty()) Text(placeholder, color = p.faint, fontSize = 13.sp); inner() },
    )
}
