package com.greenvalley.farm

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient

@Suppress("DEPRECATION")
class MainActivity : Activity() {

    companion object {
        @Volatile
        var isForeground: Boolean = false
            private set
    }

    private lateinit var webView: WebView
    private val notificationPermissionCode = 4101

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }

        FarmNotifications.ensureChannel(this)

        /* Yalnızca debug derlemesinde WebView DevTools erişimi. */
        if ((applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#F5F1E8"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.displayZoomControls = false
            settings.textZoom = 100
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            webViewClient = WebViewClient()
            addJavascriptInterface(FarmBridge(), "AndroidFarm")
            loadUrl("file:///android_asset/GreenValleyFarm.html")
        }

        setContentView(webView)
        hideSystemUi()
    }

    override fun onResume() {
        super.onResume()
        isForeground = true
        /* Tepside kalan eski hatırlatmalar uygulamaya dönünce temizlenir. */
        FarmNotifications.clearPosted(this)
        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "window.GVF && GVF.resumeApp && GVF.resumeApp();",
                null
            )
        }
    }

    override fun onPause() {
        isForeground = false
        if (::webView.isInitialized) {
            webView.evaluateJavascript(
                "window.GVF && GVF.pauseApp && GVF.pauseApp();",
                null
            )
        }
        super.onPause()
    }

    override fun onDestroy() {
        isForeground = false
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUi()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == notificationPermissionCode && ::webView.isInitialized) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                webView.evaluateJavascript(
                    "window.GVF && GVF.syncNativeNotifications && GVF.syncNativeNotifications(true);",
                    null
                )
            }
        }
    }

    private inner class FarmBridge {
        @JavascriptInterface
        fun syncNotifications(planJson: String) {
            runOnUiThread {
                FarmNotifications.sync(this@MainActivity, planJson)
            }
        }

        @JavascriptInterface
        fun cancelAll() {
            runOnUiThread {
                FarmNotifications.cancelAll(this@MainActivity)
            }
        }

        @JavascriptInterface
        fun requestNotificationPermission() {
            runOnUiThread {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                    PackageManager.PERMISSION_GRANTED
                ) {
                    requestPermissions(
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        notificationPermissionCode
                    )
                } else {
                    FarmNotifications.ensureChannel(this@MainActivity)
                }
            }
        }
    }

    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
