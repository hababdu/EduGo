package uz.edugo.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import uz.edugo.mobile.ui.EduGoTheme
import uz.edugo.mobile.ui.LocalApi
import uz.edugo.mobile.ui.LocalThemeMode
import uz.edugo.mobile.ui.LocalSetThemeMode
import uz.edugo.mobile.ui.LoginScreen
import uz.edugo.mobile.ui.MainShell
import uz.edugo.mobile.ui.roleOf

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { EduGoRoot() }
    }
}

@Composable
private fun EduGoRoot() {
    val app = LocalContext.current.applicationContext as EduGoApp
    val user by app.session.user.collectAsState()
    val u = user
    val askNotif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(u != null) {
        if (u != null && Build.VERSION.SDK_INT >= 33) askNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    val prefs = remember(app) { app.getSharedPreferences("edugo_ui", android.content.Context.MODE_PRIVATE) }
    var themeMode by remember { mutableStateOf(prefs.getString("theme_mode", "system") ?: "system") }
    CompositionLocalProvider(
        LocalApi provides app.api,
        LocalThemeMode provides themeMode,
        LocalSetThemeMode provides { next ->
            themeMode = next
            prefs.edit().putString("theme_mode", next).apply()
        },
    ) {
        EduGoTheme(roleOf(u?.role), themeMode) {
            if (u == null) LoginScreen() else MainShell(u)
        }
    }
}
