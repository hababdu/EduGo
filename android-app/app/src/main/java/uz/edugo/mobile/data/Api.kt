package uz.edugo.mobile.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.FileProvider
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import uz.edugo.mobile.BuildConfig
import java.io.IOException
import java.io.File
import kotlin.coroutines.coroutineContext
import java.util.concurrent.TimeUnit

class ApiException(val code: Int, message: String) : Exception(message)

val AppJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    isLenient = true
}

/**
 * Backend bilan ishlash: Bearer token, 401 bo'lsa refresh token orqali bir marta yangilab qayta urinish.
 * Render bepul tarifida server "uyg'onishi" 30-60 soniya olishi mumkin, shuning uchun timeout katta.
 */
class Api(private val session: Session) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(75, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val refreshLock = Mutex()

    private class Resp(val code: Int, val text: String, val sentToken: String?)

    private suspend fun exec(method: String, path: String, body: String?, auth: Boolean): Resp =
        withContext(Dispatchers.IO) {
            val token = if (auth) session.accessToken else null
            val b = Request.Builder().url(BuildConfig.API_URL + path)
            if (token != null) b.header("Authorization", "Bearer $token")
            b.header("Accept", "application/json")
            val reqBody = if (method == "GET" || method == "HEAD") null else (body ?: "").toRequestBody(jsonType)
            b.method(method, reqBody)
            try {
                client.newCall(b.build()).execute().use { r -> Resp(r.code, r.body?.string().orEmpty(), token) }
            } catch (e: IOException) {
                throw ApiException(0, "Internet bilan aloqa yo'q yoki server javob bermadi")
            }
        }

    private fun parseMessage(text: String, code: Int): String {
        val fallback = when (code) {
            401 -> "Sessiya tugadi, qayta kiring"
            403 -> "Bu amal uchun ruxsat yo'q"
            404 -> "Topilmadi"
            429 -> "Juda ko'p so'rov, birozdan keyin urinib ko'ring"
            in 500..599 -> "Server xatosi, birozdan keyin urinib ko'ring"
            else -> "So'rovda xatolik yuz berdi"
        }
        return runCatching {
            val obj = AppJson.parseToJsonElement(text) as? JsonObject ?: return fallback
            when (val m = obj["message"]) {
                is JsonPrimitive -> m.contentOrNull
                is JsonArray -> (m.firstOrNull() as? JsonPrimitive)?.contentOrNull
                else -> null
            } ?: fallback
        }.getOrDefault(fallback)
    }

    private suspend fun refresh(staleToken: String?) {
        refreshLock.withLock {
            // Boshqa so'rov allaqachon yangilab bo'lgan bo'lishi mumkin
            if (session.accessToken != null && session.accessToken != staleToken) return
            val rt = session.refreshToken
            if (rt == null) {
                session.clear()
                throw ApiException(401, "Sessiya tugadi, qayta kiring")
            }
            val body = AppJson.encodeToString(RefreshBody.serializer(), RefreshBody(rt))
            val r = exec("POST", "/api/v1/auth/refresh", body, auth = false)
            if (r.code in 200..299) {
                session.save(AppJson.decodeFromString(AuthResponse.serializer(), r.text))
            } else if (r.code in 400..499) {
                session.clear()
                throw ApiException(401, "Sessiya tugadi, qayta kiring")
            } else {
                throw ApiException(r.code, parseMessage(r.text, r.code))
            }
        }
    }

    /** Xom matn qaytaradi; xatoda ApiException tashlaydi. */
    suspend fun raw(method: String, path: String, body: String? = null, auth: Boolean = true): String {
        var r = exec(method, path, body, auth)
        if (r.code == 401 && auth && session.refreshToken != null) {
            refresh(r.sentToken)
            r = exec(method, path, body, auth)
        }
        if (r.code !in 200..299) throw ApiException(r.code, parseMessage(r.text, r.code))
        return r.text
    }

    suspend fun <T> get(path: String, ser: KSerializer<T>): T =
        AppJson.decodeFromString(ser, raw("GET", path))

    suspend fun <T> getList(path: String, item: KSerializer<T>): List<T> =
        AppJson.decodeFromString(ListSerializer(item), raw("GET", path))

    suspend fun <B> send(method: String, path: String, ser: KSerializer<B>, body: B): String =
        raw(method, path, AppJson.encodeToString(ser, body))

    suspend fun patch(path: String): String = raw("PATCH", path, "{}")


    /** Himoyalangan material faylini yuklab, vaqtinchalik cache URI qaytaradi. */
    suspend fun materialFileUri(context: Context, id: String, fileName: String, mimeType: String): Uri {
        data class BinaryResponse(val code: Int, val bytes: ByteArray, val token: String?)
        suspend fun fetch(token: String?): BinaryResponse = withContext(Dispatchers.IO) {
            val request = Request.Builder().url(BuildConfig.API_URL + "/api/v1/materials/files/$id/content")
                .header("Accept", "*/*")
                .apply { token?.let { header("Authorization", "Bearer $it") } }
                .get().build()
            try {
                client.newCall(request).execute().use { response ->
                    BinaryResponse(response.code, response.body?.bytes() ?: byteArrayOf(), token)
                }
            } catch (e: IOException) {
                throw ApiException(0, "Faylni yuklab bo'lmadi. Internetni tekshiring")
            }
        }
        var response = fetch(session.accessToken)
        if (response.code == 401 && session.refreshToken != null) {
            refresh(response.token)
            response = fetch(session.accessToken)
        }
        if (response.code !in 200..299) {
            if (response.code == 413) throw ApiException(413, "Fayl 20 MB dan katta — Telegram chatga yuboring")
            throw ApiException(response.code, parseMessage(String(response.bytes, Charsets.UTF_8), response.code))
        }
        val dir = File(context.cacheDir, "materials").apply { mkdirs() }
        val safeName = fileName.replace(Regex("[^A-Za-z0-9._-]"), "_").take(100).ifBlank { "material" }
        val file = File(dir, "${id}_$safeName")
        withContext(Dispatchers.IO) { file.writeBytes(response.bytes) }
        return FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.fileprovider", file)
    }


    /** Maktab backup faylini avval tekshiradi, so'ng tasdiqlansa tiklaydi. */
    suspend fun restoreOrganization(context: Context, uri: Uri, orgId: String, apply: Boolean): String {
        val resolver = context.contentResolver
        val name = resolver.query(uri, null, null, null, null)?.use { cursor ->
            val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
        } ?: "backup.json.gz"
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val bytes = withContext(Dispatchers.IO) {
            resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw ApiException(0, "Backup faylini o'qib bo'lmadi")
        }
        if (bytes.size > 50 * 1024 * 1024) throw ApiException(413, "Backup 50 MB dan katta")
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("file", name, bytes.toRequestBody(mime.toMediaType())).build()
        suspend fun attempt(token: String?): Resp = withContext(Dispatchers.IO) {
            val suffix = if (apply) "?apply=1" else ""
            val request = Request.Builder().url(BuildConfig.API_URL + "/api/v1/super/organizations/$orgId/restore$suffix")
                .header("Accept", "application/json")
                .apply { token?.let { header("Authorization", "Bearer $it") } }
                .post(body).build()
            try {
                client.newCall(request).execute().use { response -> Resp(response.code, response.body?.string().orEmpty(), token) }
            } catch (e: IOException) { throw ApiException(0, "Backup serverga yuborilmadi") }
        }
        var response = attempt(session.accessToken)
        if (response.code == 401 && session.refreshToken != null) {
            refresh(response.sentToken)
            response = attempt(session.accessToken)
        }
        if (response.code !in 200..299) throw ApiException(response.code, parseMessage(response.text, response.code))
        return response.text
    }

    /** Material faylini Android Document Picker orqali backendga yuboradi. */
    suspend fun uploadMaterial(context: Context, uri: Uri): MaterialFileDto {
        val resolver = context.contentResolver
        val metadata = resolver.query(uri, null, null, null, null)?.use { cursor ->
            if (!cursor.moveToFirst()) null else {
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                (if (nameIndex >= 0) cursor.getString(nameIndex) else null) to
                    (if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) cursor.getLong(sizeIndex) else -1L)
            }
        }
        val name = metadata?.first ?: "material"
        if ((metadata?.second ?: -1L) > 45L * 1024 * 1024) throw ApiException(413, "Fayl hajmi 45 MB dan oshmasligi kerak")
        val mime = resolver.getType(uri) ?: "application/octet-stream"
        val bytes = withContext(Dispatchers.IO) {
            resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw ApiException(0, "Tanlangan faylni o'qib bo'lmadi")
        }
        if (bytes.size > 45 * 1024 * 1024) throw ApiException(413, "Fayl hajmi 45 MB dan oshmasligi kerak")
        val requestBody = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("file", name, bytes.toRequestBody(mime.toMediaType()))
            .build()
        suspend fun attempt(): Resp = withContext(Dispatchers.IO) {
            val token = session.accessToken
            val request = Request.Builder().url(BuildConfig.API_URL + "/api/v1/materials/files")
                .header("Accept", "application/json")
                .apply { token?.let { header("Authorization", "Bearer $it") } }
                .post(requestBody).build()
            try {
                client.newCall(request).execute().use { response ->
                    Resp(response.code, response.body?.string().orEmpty(), token)
                }
            } catch (e: IOException) {
                throw ApiException(0, "Fayl yuklanmadi. Internetni tekshiring")
            }
        }
        var response = attempt()
        if (response.code == 401 && session.refreshToken != null) {
            refresh(response.sentToken)
            response = attempt()
        }
        if (response.code !in 200..299) throw ApiException(response.code, parseMessage(response.text, response.code))
        return AppJson.decodeFromString(MaterialFileDto.serializer(), response.text)
    }


    // ---- Kirish (Telegram bot orqali) ----
    suspend fun loginStart(): LoginStart =
        AppJson.decodeFromString(LoginStart.serializer(), raw("POST", "/api/v1/auth/app-login/start", "{}", auth = false))

    suspend fun loginPoll(id: String, secret: String): LoginPoll {
        val body = AppJson.encodeToString(PollBody.serializer(), PollBody(id, secret))
        return AppJson.decodeFromString(LoginPoll.serializer(), raw("POST", "/api/v1/auth/app-login/poll", body, auth = false))
    }

    /**
     * Server-Sent Events (AI yordamchi). `onData(event, data)` har bir blok uchun chaqiriladi.
     * 401 bo'lsa bir marta yangilab qayta urinadi. Korutina bekor qilinsa ulanish yopiladi.
     */
    @OptIn(kotlinx.coroutines.InternalCoroutinesApi::class)
    suspend fun sse(path: String, body: String, onData: (event: String?, data: String) -> Unit) {
        var token = session.accessToken
        var retried = false
        while (true) {
            val outcome: Int = withContext(Dispatchers.IO) {
                val req = Request.Builder().url(BuildConfig.API_URL + path)
                    .header("Accept", "text/event-stream")
                    .apply { token?.let { header("Authorization", "Bearer $it") } }
                    .post(body.toRequestBody(jsonType)).build()
                val call = client.newBuilder().readTimeout(0, TimeUnit.MILLISECONDS).build().newCall(req)
                val job = coroutineContext[Job]
                val handle = job?.invokeOnCompletion(onCancelling = true) { call.cancel() }
                try {
                    call.execute().use { r ->
                        if (r.code == 401) return@use 401
                        if (r.code !in 200..299) throw ApiException(r.code, parseMessage(r.body?.string().orEmpty(), r.code))
                        val src = r.body!!.source()
                        var event: String? = null
                        val data = StringBuilder()
                        while (true) {
                            val line = src.readUtf8Line() ?: break
                            if (line.isEmpty()) {
                                if (data.isNotEmpty()) onData(event, data.toString())
                                event = null; data.setLength(0)
                            } else if (line.startsWith("event:")) {
                                event = line.substring(6).trim()
                            } else if (line.startsWith("data:")) {
                                if (data.isNotEmpty()) data.append('\n')
                                data.append(line.substring(5).removePrefix(" "))
                            }
                        }
                        if (data.isNotEmpty()) onData(event, data.toString())
                        0
                    }
                } catch (e: IOException) {
                    if (job?.isActive == false) throw CancellationException("bekor qilindi")
                    throw ApiException(0, "Internet bilan aloqa uzildi")
                } finally {
                    handle?.dispose()
                }
            }
            if (outcome == 401 && !retried && session.refreshToken != null) {
                retried = true
                refresh(token)
                token = session.accessToken
                continue
            }
            if (outcome == 401) throw ApiException(401, "Sessiya tugadi, qayta kiring")
            return
        }
    }

    suspend fun logout() {
        val rt = session.refreshToken
        if (rt != null) {
            runCatching {
                raw("POST", "/api/v1/auth/logout", AppJson.encodeToString(RefreshBody.serializer(), RefreshBody(rt)), auth = false)
            }
        }
        session.clear()
    }
}
