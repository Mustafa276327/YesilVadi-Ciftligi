plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.greenvalley.farm"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.greenvalley.farm"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "2.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // İlk sürüm: debug anahtarıyla imzalanır, doğrudan kurulabilir.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
