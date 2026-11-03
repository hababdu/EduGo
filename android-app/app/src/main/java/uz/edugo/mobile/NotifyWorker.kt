package uz.edugo.mobile

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.Constraints
import uz.edugo.mobile.data.NotificationItem
import java.util.concurrent.TimeUnit

/**
 * Firebase'siz bildirishnomalar: har ~15 daqiqada (Android minimumi) yangi o'qilmagan xabarlarni
 * tekshiradi va telefonga bildirishnoma chiqaradi.
 */
class NotifyWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val app = applicationContext as EduGoApp
        if (app.session.refreshToken == null) return Result.success()
        val list = try {
            app.api.getList("/api/v1/notifications/me", NotificationItem.serializer())
        } catch (e: Exception) {
            return Result.retry()
        }
        val prefs = applicationContext.getSharedPreferences("edugo_notify", Context.MODE_PRIVATE)
        val seen = prefs.getStringSet("seen", emptySet()).orEmpty().toMutableSet()
        val fresh = list.filter { !it.isRead && it.id !in seen }
        // Birinchi ishga tushishda eski xabarlar bilan to'ldirib yubormaymiz
        val first = !prefs.getBoolean("init", false)
        if (!first && fresh.isNotEmpty()) show(fresh)
        prefs.edit().putBoolean("init", true).putStringSet("seen", (seen + list.map { it.id }).toList().takeLast(200).toSet()).apply()
        return Result.success()
    }

    private fun show(items: List<NotificationItem>) {
        val ctx = applicationContext
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        ensureChannel(ctx)
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val nm = NotificationManagerCompat.from(ctx)
        items.take(3).forEach { n ->
            val b = NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(n.title)
                .setContentText(n.body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(n.body))
                .setAutoCancel(true)
                .setContentIntent(open)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            @Suppress("MissingPermission")
            nm.notify(n.id.hashCode(), b.build())
        }
        if (items.size > 3) {
            @Suppress("MissingPermission")
            nm.notify(1, NotificationCompat.Builder(ctx, CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("EduGo").setContentText("Yana ${items.size - 3} ta yangi xabar").setAutoCancel(true).setContentIntent(open).build())
        }
    }

    companion object {
        const val CHANNEL = "edugo_updates"
        const val WORK = "edugo_notify"

        fun ensureChannel(ctx: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                val nm = ctx.getSystemService(NotificationManager::class.java)
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "Xabarlar", NotificationManager.IMPORTANCE_DEFAULT))
            }
        }

        fun schedule(ctx: Context) {
            val req = PeriodicWorkRequestBuilder<NotifyWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, req)
        }
    }
}
