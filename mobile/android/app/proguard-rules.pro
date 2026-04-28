# ============================================================
# TechBite ProGuard / R8 Rules
# ============================================================

# --- React Native core ---
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.**

# --- React Native Reanimated ---
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# --- React Native Turbo Modules ---
-keep class com.facebook.react.turbomodule.** { *; }

# --- Firebase (must keep for reflection-based init) ---
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# --- Google Sign-In ---
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }

# --- Expo modules ---
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# --- OkHttp / networking (used by React Native fetch) ---
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# --- Keep source file names for crash reporting ---
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Keep enums (R8 can strip them aggressively) ---
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# --- Serializable classes ---
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
