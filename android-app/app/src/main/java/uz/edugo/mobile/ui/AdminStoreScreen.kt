package uz.edugo.mobile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import uz.edugo.mobile.data.FeatureStore

private fun som(n: Long) = "%,d so'm".format(n).replace(',', ' ')

/** Funksiyalar do'koni: yoqilgan funksiyaning narxi oylik to'lovga qo'shiladi va shu yerda ko'rinadi. */
@Composable
fun AdminStoreScreen() {
    val p = P
    val api = LocalApi.current
    val scope = rememberCoroutineScope()
    val store = rememberRemote("/api/v1/admin/features", FeatureStore.serializer())
    var busy by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }

    fun toggle(key: String, enable: Boolean) {
        busy = key; message = null
        scope.launch {
            try {
                if (enable) api.raw("POST", "/api/v1/admin/features/$key/enable", "{}") else api.raw("DELETE", "/api/v1/admin/features/$key")
                message = if (enable) "Yoqildi — narxi oylik to'lovga qo'shildi" else "O'chirildi — keyingi oy hisobidan chiqadi"
                store.reload()
            } catch (e: Exception) { message = e.message ?: "Amal bajarilmadi" } finally { busy = null }
        }
    }

    RefreshColumn(listOf(store)) {
        Hero("EDUGO · DO'KON", "Funksiyalar do'koni", "Kerakli imkoniyatni yoqing — narxi oylik to'lovga qo'shiladi")
        message?.let { Text(it, color = p.accent, fontSize = 12.sp) }
        Section(store) { s ->
            SectionTitle("OYLIK TO'LOV")
            Panel {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Asosiy tarif", color = p.muted, fontSize = 12.sp)
                        Text(if (s.baseFee > 0) som(s.baseFee) else "belgilanmagan", color = p.ink, fontSize = 12.sp)
                    }
                    s.items.filter { it.enabled }.forEach {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${it.icon} ${it.name}", color = p.muted, fontSize = 12.sp)
                            Text("+ ${som(it.price)}", color = p.ink, fontSize = 12.sp)
                        }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Jami (oyiga)", color = p.ink, fontWeight = FontWeight.Bold)
                        Text(som(s.total), color = p.gold, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
            SectionTitle("FUNKSIYALAR")
            s.items.forEach { f ->
                Panel {
                    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${f.icon} ${f.name}", color = p.ink, fontWeight = FontWeight.Bold, modifier = androidx.compose.ui.Modifier.weight(1f))
                            if (f.enabled) Pill("Yoqilgan", p.teal)
                        }
                        Text(f.description, color = p.muted, fontSize = 11.sp)
                        Text("${som(f.price)} / oyiga", color = p.gold, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        TextButton(enabled = busy == null && (f.enabled || f.available), onClick = { toggle(f.key, !f.enabled) }) {
                            Text(if (f.enabled) "O'chirish" else "Yoqish", color = if (f.enabled) p.coral else p.accent)
                        }
                    }
                }
            }
        }
    }
}
