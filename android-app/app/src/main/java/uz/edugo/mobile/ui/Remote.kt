package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import uz.edugo.mobile.data.Api
import uz.edugo.mobile.data.ApiException

val LocalApi = staticCompositionLocalOf<Api> { error("Api taqdim etilmagan") }

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Failure(val message: String) : UiState<Nothing>
    data class Ready<T>(val value: T, val refreshing: Boolean = false) : UiState<T>
}

class Remote<T>(private val st: State<UiState<T>>, val reload: () -> Unit) {
    val state: UiState<T> get() = st.value
    val refreshing: Boolean get() = (st.value as? UiState.Ready<T>)?.refreshing == true
}

/** GET so'rovi: yuklanadi, xatoda xabar beradi, `reload()` bilan yangilanadi (eski ma'lumot ko'rinib turadi). */
@Composable
fun <T> rememberRemote(path: String, ser: KSerializer<T>): Remote<T> {
    val api = LocalApi.current
    val st = remember(path) { mutableStateOf<UiState<T>>(UiState.Loading) }
    var tick by remember(path) { mutableIntStateOf(0) }
    LaunchedEffect(path, tick) {
        val keep = (st.value as? UiState.Ready<T>)?.value
        st.value = if (keep != null) UiState.Ready(keep, true) else UiState.Loading
        st.value = try {
            UiState.Ready(api.get(path, ser), false)
        } catch (e: CancellationException) {
            throw e
        } catch (e: ApiException) {
            UiState.Failure(e.message ?: "Xatolik")
        } catch (e: Exception) {
            UiState.Failure("Ma'lumotni o'qib bo'lmadi")
        }
    }
    return remember(path) { Remote(st) { tick++ } }
}

@Composable
fun <T> rememberRemoteList(path: String, item: KSerializer<T>): Remote<List<T>> = rememberRemote(path, ListSerializer(item))

/** Bitta bo'lim: yuklanish / xato / tayyor. Tayyor bo'lsa `content` chaqiriladi. */
@Composable
fun <T> Section(remote: Remote<T>, content: @Composable ColumnScope.(T) -> Unit) {
    when (val s = remote.state) {
        is UiState.Loading -> Loading()
        is UiState.Failure -> ErrorBox(s.message, remote.reload)
        is UiState.Ready -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { content(s.value) }
    }
}

/** Tortib yangilash + scroll. `refreshing` ixtiyoriy remote'lardan olinadi. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RefreshColumn(
    remotes: List<Remote<*>>,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    PullToRefreshBox(
        isRefreshing = remotes.any { it.refreshing },
        onRefresh = { remotes.forEach { it.reload() } },
        modifier = modifier.fillMaxSize(),
    ) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}
