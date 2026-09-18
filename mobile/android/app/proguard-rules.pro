# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Sign-In & Play Services
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.common.api.** { *; }
-keep class com.reactnativegooglesignin.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Expo modules & image decoders
-keep class expo.modules.** { *; }
-keep class com.facebook.fresco.** { *; }
-keep class com.facebook.imagepipeline.** { *; }

# OkHttp & Networking
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-dontwarn okhttp3.**
-dontwarn okio.**

