package com.greenvalley.farm

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

/**
 * Çiftlik olaylarını (hasat, besleme, fabrika, sipariş, günlük ödül)
 * uygulama kapalıyken de AlarmManager ile hatırlatır.
 *
 * WebView tarafındaki plan mutlak epoch milisaniyesi taşır. Plan her
 * kayıtta aynıysa JS köprüsü yeniden göndermez; burada da eski plan
 * iptal edilip yalnızca gelecekteki olaylar kurulur.
 */
object FarmNotifications {
    const val CHANNEL_ID = "green_valley_farm_events"
    const val ACTION_ALARM = "com.greenvalley.farm.NOTIFICATION_ALARM"

    private const val PREFS = "gvf_notification_plan"
    private const val KEY_PLAN = "plan"
    private const val KEY_IDS = "ids"
    private const val ALARM_REQUEST_BASE = 42000
    private const val CONTENT_REQUEST_BASE = 52000

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Çiftlik bildirimleri",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Hasat, besleme, fabrika, sipariş ve günlük ödül hatırlatmaları"
                    enableVibration(true)
                    setShowBadge(true)
                    lightColor = Color.parseColor("#2C6B42")
                    enableLights(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    fun isPermissionGranted(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }

    /** Gelen planı doğrular, eski alarmları iptal eder ve yeni alarmları kurar. */
    fun sync(context: Context, planJson: String) {
        ensureChannel(context)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        cancelScheduled(context, readIds(prefs))

        val source = try { JSONArray(planJson) } catch (_: Exception) { JSONArray() }
        val upcoming = JSONArray()
        val ids = linkedSetOf<String>()
        val now = System.currentTimeMillis()

        for (i in 0 until source.length()) {
            val item = source.optJSONObject(i) ?: continue
            val id = item.optString("id").trim()
            if (id.isEmpty()) continue
            val at = item.optLong("at", 0L)
            if (at <= now + 1500L) continue
            if (at > now + 72L * 60L * 60L * 1000L) continue

            val clean = JSONObject().apply {
                put("id", id)
                put("title", item.optString("title", "Çiftlik bildirimi").take(80))
                put("text", item.optString("text", "Çiftliğinde yeni bir gelişme var.").take(240))
                put("at", at)
                put("icon", item.optString("icon", "i-bell"))
            }
            upcoming.put(clean)
            ids.add(id)
            scheduleAlarm(context, clean)
        }

        prefs.edit()
            .putString(KEY_PLAN, upcoming.toString())
            .putStringSet(KEY_IDS, ids)
            .apply()
    }

    fun cancelAll(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        cancelScheduled(context, readIds(prefs))
        prefs.edit().remove(KEY_PLAN).remove(KEY_IDS).apply()
    }

    /** Uygulama açıldığında tepside kalan eski bildirimleri temizler. */
    fun clearPosted(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancelAll()
    }

    fun scheduleFromStored(context: Context) {
        ensureChannel(context)
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_PLAN, null) ?: return
        val plan = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        val ids = linkedSetOf<String>()
        val now = System.currentTimeMillis()
        for (i in 0 until plan.length()) {
            val item = plan.optJSONObject(i) ?: continue
            if (item.optLong("at", 0L) <= now + 1500L) continue
            val id = item.optString("id")
            if (id.isNotEmpty()) {
                ids.add(id)
                scheduleAlarm(context, item)
            }
        }
        prefs.edit().putStringSet(KEY_IDS, ids).apply()
    }

    private fun scheduleAlarm(context: Context, item: JSONObject) {
        val id = item.optString("id")
        val at = item.optLong("at", 0L)
        if (id.isEmpty() || at <= 0L) return

        val intent = Intent(context, FarmAlarmReceiver::class.java).apply {
            action = ACTION_ALARM
            putExtra("id", id)
            putExtra("title", item.optString("title", "Çiftlik bildirimi"))
            putExtra("text", item.optString("text", ""))
            putExtra("icon", item.optString("icon", "i-bell"))
            putExtra("at", at)
        }
        val requestCode = ALARM_REQUEST_BASE + (abs(id.hashCode()) % 10000)
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && alarm.canScheduleExactAlarms()) {
                alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            } else {
                alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            }
        } catch (_: SecurityException) {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } catch (_: Exception) {
            // Alarm kurulamazsa oyun içi bildirim yine çalışır.
        }
    }

    private fun cancelScheduled(context: Context, ids: Set<String>) {
        if (ids.isEmpty()) return
        val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        ids.forEach { id ->
            val intent = Intent(context, FarmAlarmReceiver::class.java).apply { action = ACTION_ALARM }
            val requestCode = ALARM_REQUEST_BASE + (abs(id.hashCode()) % 10000)
            val pending = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (pending != null) {
                alarm.cancel(pending)
                pending.cancel()
            }
        }
    }

    private fun readIds(prefs: android.content.SharedPreferences): Set<String> {
        return prefs.getStringSet(KEY_IDS, emptySet()) ?: emptySet()
    }

    /** AlarmReceiver tarafından çağrılır. Uygulama öndeyse tepside bildirim gösterme. */
    fun show(context: Context, intent: Intent) {
        if (MainActivity.isForeground) return
        if (!isPermissionGranted(context)) return

        ensureChannel(context)
        val id = intent.getStringExtra("id") ?: "farm-event"
        val title = intent.getStringExtra("title") ?: "Yeşil Vadi Çiftliği"
        val text = intent.getStringExtra("text") ?: "Çiftliğinde yeni bir gelişme var."

        val contentIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("notificationId", id)
        }
        val content = PendingIntent.getActivity(
            context,
            CONTENT_REQUEST_BASE + (abs(id.hashCode()) % 10000),
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(context, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(context)
        }
        val notification = builder
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(Notification.BigTextStyle().bigText(text))
            .setContentIntent(content)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setColor(Color.parseColor("#2C6B42"))
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(abs(id.hashCode()) % 100000, notification)
    }
}
