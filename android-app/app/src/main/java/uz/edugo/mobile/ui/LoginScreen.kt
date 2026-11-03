package uz.edugo.mobile.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import uz.edugo.mobile.EduGoApp
import uz.edugo.mobile.data.ApiException
import uz.edugo.mobile.data.AuthResponse
import uz.edugo.mobile.data.LoginStart

/** Telegram bot orqali kirish: kod olinadi → Telegram ochiladi → bot tasdiqlaydi → ilova token oladi. */
@Composable
fun LoginScreen() {
    val p = P
    val ctx = LocalContext.current
    val app = ctx.applicationContext as EduGoApp
    val scope = rememberCoroutineScope()
    var attempt by remember { mutableStateOf<LoginStart?>(null) }
    var starting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun openTelegram(s: LoginStart) {
        val tg = Intent(Intent.ACTION_VIEW, Uri.parse(s.deepLink))
        try {
            ctx.startActivity(tg)
        } catch (e: ActivityNotFoundException) {
            try {
                ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(s.url)))
            } catch (e2: ActivityNotFoundException) {
                error = "Telegram topilmadi. Telegram'ni o'rnating."
            }
        }
    }

    // Bot tasdiqlashini kutish
    LaunchedEffect(attempt) {
        val s = attempt ?: return@LaunchedEffect
        val deadline = System.currentTimeMillis() + s.expiresIn * 1000L
        while (System.currentTimeMillis() < deadline) {
            delay(2500)
            try {
                val r = app.api.loginPoll(s.id, s.secret)
                if (r.status == "ok" && r.accessToken != null && r.refreshToken != null && r.user != null) {
                    app.session.save(AuthResponse(r.accessToken, r.refreshToken, r.user))
                    return@LaunchedEffect
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: ApiException) {
                if (e.code == 404 || e.code == 401) {
                    error = "Kod eskirgan. Qaytadan urinib ko'ring."
                    attempt = null
                    return@LaunchedEffect
                }
                // tarmoq xatosi — kutishda davom etamiz
            }
        }
        error = "Vaqt tugadi. Qaytadan urinib ko'ring."
        attempt = null
    }

    Box(Modifier.fillMaxSize()) {
        AppBackground()
        Column(
            Modifier.fillMaxSize().padding(28.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.size(84.dp).background(p.accent.copy(alpha = 0.18f), RoundedCornerShape(26.dp)), contentAlignment = Alignment.Center) {
                Text("🎓", fontSize = 40.sp)
            }
            Text("EduGo", color = p.ink, fontSize = 38.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 18.dp))
            Text("O'qish, vazifa va natijalar — bir ilovada", color = p.muted, fontSize = 14.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp, bottom = 36.dp))

            val a = attempt
            if (a == null) {
                PrimaryButton(
                    if (starting) "Tayyorlanmoqda…" else "Telegram orqali kirish",
                    enabled = !starting,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        starting = true; error = null
                        scope.launch {
                            try {
                                val s = app.api.loginStart()
                                attempt = s
                                openTelegram(s)
                            } catch (e: ApiException) {
                                error = e.message
                            }
                            starting = false
                        }
                    },
                )
                Text("Akkauntingiz Telegram orqali tasdiqlanadi", color = p.faint, fontSize = 12.sp, modifier = Modifier.padding(top = 12.dp))
            } else {
                CircularProgressIndicator(color = p.accent, strokeWidth = 3.dp)
                Text("Telegram ochildi", color = p.ink, fontWeight = FontWeight.Bold, fontSize = 17.sp, modifier = Modifier.padding(top = 18.dp))
                Text("Botda START tugmasini bosing, so'ng shu ilovaga qayting. Kirish avtomatik bajariladi.", color = p.muted, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 6.dp, bottom = 22.dp))
                PrimaryButton("Telegram'ni qayta ochish", onClick = { openTelegram(a) }, modifier = Modifier.fillMaxWidth())
                Text("Bekor qilish", color = p.muted, fontSize = 14.sp, modifier = Modifier.pressable { attempt = null }.padding(16.dp))
            }
            error?.let { Text(it, color = p.coral, fontSize = 13.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 16.dp)) }
        }
    }
}
