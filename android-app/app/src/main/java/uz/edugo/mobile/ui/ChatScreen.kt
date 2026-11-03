package uz.edugo.mobile.ui

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import uz.edugo.mobile.EduGoApp
import uz.edugo.mobile.data.ActionCard
import uz.edugo.mobile.data.ActionResult
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.AppJson
import uz.edugo.mobile.data.ChatBody
import uz.edugo.mobile.data.ChatEvent
import uz.edugo.mobile.data.ChatTurn

class ChatPart(val kind: String, text: String = "", val tool: String = "", val card: ActionCard? = null) {
    var text by mutableStateOf(text)
    var status by mutableStateOf("running") // tool: running/ok/fail; card: pending/done/cancelled/error
    var note by mutableStateOf<String?>(null)
}

class ChatMsg(val user: Boolean, text: String = "") {
    val parts = mutableStateListOf<ChatPart>().also { if (text.isNotEmpty()) it.add(ChatPart("text", text)) }
    var streaming by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    val plain: String get() = parts.filter { it.kind == "text" }.joinToString("") { it.text }
}

class ChatViewModel(app: Application) : AndroidViewModel(app) {
    private val api = (app as EduGoApp).api
    val messages = mutableStateListOf<ChatMsg>()
    var busy by mutableStateOf(false)
    private var job: Job? = null

    fun reset() { job?.cancel(); messages.clear(); busy = false }

    fun send(text: String) {
        if (busy || text.isBlank()) return
        messages.add(ChatMsg(true, text.trim()))
        run()
    }

    fun retry() {
        if (busy) return
        if (messages.lastOrNull()?.user == false) messages.removeAt(messages.lastIndex)
        if (messages.lastOrNull()?.user == true) run()
    }

    fun stop() { job?.cancel() }

    private fun run() {
        val reply = ChatMsg(false).also { it.streaming = true }
        messages.add(reply)
        busy = true
        val history = messages.dropLast(1).filter { it.plain.isNotBlank() }.takeLast(20)
            .map { ChatTurn(if (it.user) "user" else "assistant", it.plain.take(4000)) }
        job = viewModelScope.launch {
            try {
                api.sse("/api/v1/assistant/chat", AppJson.encodeToString(ChatBody.serializer(), ChatBody(history))) { event, data ->
                    if (data == "[DONE]") return@sse
                    val ev = runCatching { AppJson.decodeFromString(ChatEvent.serializer(), data) }.getOrNull() ?: return@sse
                    if (event == "error") { reply.error = ev.message ?: "AI xizmatida xatolik"; return@sse }
                    when (ev.type) {
                        "text" -> {
                            val last = reply.parts.lastOrNull()
                            if (last != null && last.kind == "text") last.text += ev.delta.orEmpty()
                            else reply.parts.add(ChatPart("text", ev.delta.orEmpty()))
                        }
                        "tool_start" -> reply.parts.add(ChatPart("tool", ev.label ?: ev.name.orEmpty(), tool = ev.id.orEmpty()))
                        "tool_end" -> reply.parts.lastOrNull { it.kind == "tool" && it.tool == ev.id }?.status = if (ev.ok == true) "ok" else "fail"
                        "confirmation" -> ev.action?.let { c -> reply.parts.add(ChatPart("card", card = c).also { it.status = "pending" }) }
                        "notice" -> reply.parts.add(ChatPart("notice", ev.message.orEmpty()))
                    }
                }
                if (reply.parts.isEmpty() && reply.error == null) reply.error = "Javob kelmadi"
            } catch (e: CancellationException) {
                // foydalanuvchi to'xtatdi
            } catch (e: ApiException) {
                reply.error = if (e.code == 429) "AI hozir band, birozdan keyin urinib ko'ring" else e.message ?: "AI xizmati vaqtincha ishlamayapti"
            } catch (e: Exception) {
                reply.error = "AI xizmati vaqtincha ishlamayapti"
            } finally {
                reply.streaming = false
                busy = false
            }
        }
    }

    fun decide(part: ChatPart, confirm: Boolean) {
        val card = part.card ?: return
        part.status = "working"
        viewModelScope.launch {
            try {
                val raw = api.raw("POST", "/api/v1/assistant/actions/${card.id}/${if (confirm) "confirm" else "cancel"}", "{}")
                val r = runCatching { AppJson.decodeFromString(ActionResult.serializer(), raw) }.getOrNull()
                part.status = if (confirm) "done" else "cancelled"
                part.note = r?.message
            } catch (e: ApiException) {
                part.status = "error"; part.note = e.message
            }
        }
    }
}

/** **qalin** va `kod` belgilarini oddiy formatlashga aylantiradi. */
private fun md(text: String, bold: androidx.compose.ui.graphics.Color, mono: androidx.compose.ui.graphics.Color): AnnotatedString = buildAnnotatedString {
    text.lines().forEachIndexed { li, raw ->
        if (li > 0) append('\n')
        var line = raw.trimEnd()
        line = when {
            line.startsWith("### ") -> line.removePrefix("### ")
            line.startsWith("## ") -> line.removePrefix("## ")
            line.startsWith("# ") -> line.removePrefix("# ")
            line.startsWith("- ") || line.startsWith("* ") -> "• " + line.drop(2)
            else -> line
        }
        var i = 0
        while (i < line.length) {
            if (line.startsWith("**", i)) {
                val end = line.indexOf("**", i + 2)
                if (end > i) { withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = bold)) { append(line.substring(i + 2, end)) }; i = end + 2; continue }
            }
            if (line[i] == '`') {
                val end = line.indexOf('`', i + 1)
                if (end > i) { withStyle(SpanStyle(color = mono, fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace)) { append(line.substring(i + 1, end)) }; i = end + 1; continue }
            }
            append(line[i]); i++
        }
    }
}

private fun suggestions(role: Role): List<String> = when (role) {
    Role.STUDENT -> listOf("Qanday ketyapman?", "Qaysi mavzularda zaifman?", "Reytingda nechanchiman?")
    Role.TEACHER -> listOf("Qaysi o'quvchilarga yordam kerak?", "Guruhlarim holati", "Mening testlarim")
    else -> listOf("Platforma ko'rsatkichlari", "Faol o'quvchilar kimlar?", "Mening testlarim")
}

@Composable
fun ChatScreen(role: Role) {
    val p = P
    val vm: ChatViewModel = viewModel()
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val last = vm.messages.lastOrNull()
    LaunchedEffect(vm.messages.size, last?.parts?.size, last?.parts?.lastOrNull()?.text?.length) {
        if (vm.messages.isNotEmpty()) listState.scrollToItem(vm.messages.lastIndex)
    }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("AI yordamchi", color = p.ink, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                Text("Savol bering yoki buyruq yozing", color = p.muted, fontSize = 12.sp)
            }
            if (vm.messages.isNotEmpty()) Text("Tozalash", color = p.muted, fontSize = 13.sp, modifier = Modifier.pressable { vm.reset() }.padding(8.dp))
        }
        if (vm.messages.isEmpty()) {
            Column(Modifier.weight(1f).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Hero("AI", "Men sizga yordam beraman", "Natijalar, tahlil va tavsiyalar")
                suggestions(role).forEachIndexed { i, s ->
                    Text(
                        s, color = p.ink, fontSize = 14.sp,
                        modifier = Modifier.fillMaxWidth().stagger(i).background(p.surface.copy(alpha = 0.7f), RoundedCornerShape(16.dp))
                            .border(1.dp, p.accent.copy(alpha = 0.35f), RoundedCornerShape(16.dp)).pressable { vm.send(s) }.padding(14.dp),
                    )
                }
            }
        } else {
            LazyColumn(Modifier.weight(1f), state = listState, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(vm.messages) { m -> MessageView(m, vm) }
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            BasicTextField(
                value = input, onValueChange = { input = it },
                textStyle = TextStyle(color = p.ink, fontSize = 15.sp), cursorBrush = SolidColor(p.accent), maxLines = 4,
                modifier = Modifier.weight(1f).background(p.surface.copy(alpha = 0.85f), RoundedCornerShape(22.dp)).border(1.dp, p.ink.copy(alpha = 0.12f), RoundedCornerShape(22.dp)).padding(horizontal = 18.dp, vertical = 14.dp),
                decorationBox = { inner -> if (input.isEmpty()) Text("Savol yoki buyruq yozing…", color = p.faint, fontSize = 15.sp); inner() },
            )
            Box(
                Modifier.background(if (vm.busy) p.coral else p.accent, CircleShape)
                    .pressable { if (vm.busy) vm.stop() else if (input.isNotBlank()) { vm.send(input); input = "" } }
                    .padding(horizontal = 18.dp, vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) { Text(if (vm.busy) "■" else "➤", color = if (p.dark) p.base else androidx.compose.ui.graphics.Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun MessageView(m: ChatMsg, vm: ChatViewModel) {
    val p = P
    if (m.user) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            Text(
                m.plain, color = if (p.dark) p.base else androidx.compose.ui.graphics.Color.White, fontSize = 15.sp,
                modifier = Modifier.widthIn(max = 300.dp).background(p.accent, RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp)).padding(horizontal = 14.dp, vertical = 10.dp),
            )
        }
        return
    }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        m.parts.forEach { part ->
            when (part.kind) {
                "text" -> if (part.text.isNotBlank()) Text(
                    md(part.text, p.ink, p.accent), color = p.ink, fontSize = 15.sp, lineHeight = 21.sp,
                    modifier = Modifier.widthIn(max = 330.dp).background(p.surface.copy(alpha = 0.7f), RoundedCornerShape(20.dp, 20.dp, 20.dp, 6.dp))
                        .border(1.dp, p.ink.copy(alpha = 0.08f), RoundedCornerShape(20.dp, 20.dp, 20.dp, 6.dp)).padding(horizontal = 14.dp, vertical = 10.dp),
                )
                "tool" -> Text(
                    (when (part.status) { "ok" -> "✓ "; "fail" -> "✕ "; else -> "… " }) + part.text,
                    color = when (part.status) { "ok" -> p.teal; "fail" -> p.coral; else -> p.muted }, fontSize = 12.sp,
                    modifier = Modifier.background(p.ink.copy(alpha = 0.07f), CircleShape).padding(horizontal = 10.dp, vertical = 5.dp),
                )
                "notice" -> Text(part.text, color = p.muted, fontSize = 12.sp)
                "card" -> part.card?.let { c ->
                    Column(
                        Modifier.fillMaxWidth().background(p.gold.copy(alpha = 0.10f), RoundedCornerShape(18.dp)).border(1.dp, p.gold.copy(alpha = 0.4f), RoundedCornerShape(18.dp)).padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(c.summary, color = p.ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        c.details.forEach { Text("${it.label}: ${it.value}", color = p.muted, fontSize = 12.sp) }
                        when (part.status) {
                            "pending", "error" -> {
                                part.note?.let { Text(it, color = p.coral, fontSize = 12.sp) }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    PrimaryButton("Tasdiqlash", { vm.decide(part, true) })
                                    Text("Bekor qilish", color = p.muted, fontWeight = FontWeight.SemiBold, modifier = Modifier.pressable { vm.decide(part, false) }.padding(horizontal = 12.dp, vertical = 14.dp))
                                }
                            }
                            "working" -> Text("Bajarilmoqda…", color = p.muted, fontSize = 12.sp)
                            "done" -> Text("✓ " + (part.note ?: "Bajarildi"), color = p.teal, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            else -> Text("Bekor qilindi", color = p.muted, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
        if (m.streaming && m.parts.isEmpty()) Text("Yozmoqda…", color = p.muted, fontSize = 13.sp)
        m.error?.let { e ->
            Column(Modifier.fillMaxWidth().background(p.coral.copy(alpha = 0.12f), RoundedCornerShape(16.dp)).border(1.dp, p.coral.copy(alpha = 0.3f), RoundedCornerShape(16.dp)).padding(12.dp)) {
                Text(e, color = p.ink, fontSize = 13.sp)
                if (!vm.busy && m === vm.messages.lastOrNull()) Text("Qayta urinish", color = p.coral, fontWeight = FontWeight.Bold, modifier = Modifier.pressable { vm.retry() }.padding(top = 6.dp))
            }
        }
    }
}
