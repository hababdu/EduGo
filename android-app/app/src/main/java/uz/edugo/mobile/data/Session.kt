package uz.edugo.mobile.data

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/** Tokenlar va foydalanuvchi qurilmada saqlanadi (private SharedPreferences). */
class Session(context: Context) {
    private val prefs = context.getSharedPreferences("edugo_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    @Volatile var accessToken: String? = prefs.getString("access", null)
        private set
    @Volatile var refreshToken: String? = prefs.getString("refresh", null)
        private set

    private val _user = MutableStateFlow(loadUser())
    val user: StateFlow<AuthUser?> = _user

    private fun loadUser(): AuthUser? {
        if (prefs.getString("refresh", null) == null) return null
        return prefs.getString("user", null)?.let {
            runCatching { json.decodeFromString<AuthUser>(it) }.getOrNull()
        }
    }

    @Synchronized
    fun save(r: AuthResponse) {
        accessToken = r.accessToken
        refreshToken = r.refreshToken
        prefs.edit()
            .putString("access", r.accessToken)
            .putString("refresh", r.refreshToken)
            .putString("user", json.encodeToString(r.user))
            .apply()
        _user.value = r.user
    }

    @Synchronized
    fun clear() {
        accessToken = null
        refreshToken = null
        prefs.edit().clear().apply()
        _user.value = null
    }
}
