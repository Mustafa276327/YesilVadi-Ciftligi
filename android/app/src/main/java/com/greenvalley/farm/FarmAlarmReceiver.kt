package com.greenvalley.farm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class FarmAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == FarmNotifications.ACTION_ALARM) {
            FarmNotifications.show(context, intent)
        }
    }
}
