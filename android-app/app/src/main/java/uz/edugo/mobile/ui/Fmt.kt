package uz.edugo.mobile.ui

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val TASHKENT: TimeZone = TimeZone.getTimeZone("Asia/Tashkent")

/** "2026-11-04T09:30:00.000Z" -> "04.11 14:30" (Toshkent vaqti) */
fun fmtDue(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return runCatching {
        val src = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val out = SimpleDateFormat("dd.MM HH:mm", Locale.US).apply { timeZone = TASHKENT }
        out.format(src.parse(iso.take(19))!!)
    }.getOrDefault(iso.take(10))
}

/** "2026-11-04" -> "04.11" */
fun fmtDay(date: String?): String {
    if (date == null || date.length < 10) return date.orEmpty()
    return "${date.substring(8, 10)}.${date.substring(5, 7)}"
}

/** Toshkent bo'yicha bugun: YYYY-MM-DD */
fun todayTashkent(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TASHKENT }.format(Date())

fun money(v: Double?): String {
    if (v == null) return ""
    val n = v.toLong().toString().reversed().chunked(3).joinToString(" ").reversed()
    return "$n so'm"
}

fun roleLabel(role: String): String = when (role) {
    "STUDENT" -> "O'quvchi"
    "TEACHER" -> "O'qituvchi"
    "ADMIN" -> "Administrator"
    "SUPER_ADMIN" -> "Super admin"
    "PARENT" -> "Ota-ona"
    else -> role
}
