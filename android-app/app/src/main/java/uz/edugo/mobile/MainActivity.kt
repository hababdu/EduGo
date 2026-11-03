package uz.edugo.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import uz.edugo.mobile.ui.EduGoTheme
import uz.edugo.mobile.ui.LocalApi
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
    CompositionLocalProvider(LocalApi provides app.api) {
        EduGoTheme(roleOf(u?.role)) {
            if (u == null) LoginScreen() else MainShell(u)
        }
    }
}
