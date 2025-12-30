package com.safemindai;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;

public class NotificationService extends NotificationListenerService {

    // Guardamos los IDs de los mensajes para que no se repitan
    private static final HashSet<String> processedMessages = new HashSet<>();
    private static final int MAX_HISTORY = 50; // Solo recordamos los últimos 50 para ahorrar RAM

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        String packageName = sbn.getPackageName();

        // 1. FILTRO DE APLICACIONES CRÍTICAS (Whitelist)
        boolean isValidApp =
                packageName.equals("com.whatsapp") ||
                        packageName.equals("com.whatsapp.w4b") ||
                        packageName.equals("org.telegram.messenger") ||
                        packageName.equals("com.instagram.android") ||
                        packageName.equals("com.facebook.orca") ||
                        packageName.equals("com.discord") ||
                        packageName.equals("com.roblox.client") ||
                        packageName.equals("com.zhiliaoapp.musically");

        if (!isValidApp) return;

        Bundle extras = sbn.getNotification().extras;
        CharSequence text = extras.getCharSequence("android.text");
        String title = extras.getString("android.title");

        if (text != null) {
            String messageStr = text.toString();

            // 2. FILTRO DE RUIDO Y MENSAJES DE ESTADO (System/Service Noise)
            // Agrupamos todos los casos detectados en las pruebas de campo
            boolean isNoise =
                    messageStr.matches(".*\\d+ mensajes nuevos.*") || // WhatsApp: "5 mensajes nuevos"
                            messageStr.contains("Preparando copia de seguridad") ||
                            messageStr.startsWith("Subiendo:") ||
                            messageStr.contains("Copia de seguridad en curso") ||
                            messageStr.contains("Buscando nuevos mensajes") ||
                            messageStr.contains("Checking for messages") ||
                            messageStr.equals("Cifrado de extremo a extremo");

            if (isNoise) return;

            // 3. CONTROL DE DUPLICIDAD (HashSet Idempotency)
            // Generamos firma única: App + Remitente + Contenido
            String uniqueId = packageName + "|" + (title != null ? title : "") + "|" + messageStr;

            if (processedMessages.contains(uniqueId)) {
                return;
            }

            // Gestión de memoria del historial de firmas
            if (processedMessages.size() >= MAX_HISTORY) {
                processedMessages.clear();
            }
            processedMessages.add(uniqueId);

            // 4. PROCESAMIENTO DE TIEMPO Y ENVÍO
            long timestamp = sbn.getPostTime();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            String dateFormmatted = sdf.format(new Date(timestamp));

            // Enviar al Bridge de React Native para el análisis de IA
            sendEventToJS(
                    title != null ? title : "Unknown Sender",
                    messageStr,
                    packageName,
                    dateFormmatted
            );
        }
    }

    private void sendEventToJS(String title, String message, String app, String timestamp) {
        try {
            ReactApplication reactApplication = (ReactApplication) getApplication();
            if (reactApplication == null) return;

            ReactNativeHost reactNativeHost = reactApplication.getReactNativeHost();
            ReactContext reactContext = reactNativeHost.getReactInstanceManager().getCurrentReactContext();

            if (reactContext != null) {
                WritableMap params = Arguments.createMap();
                params.putString("title", title);
                params.putString("message", message);
                params.putString("app", app);
                params.putString("timestamp", timestamp);

                reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("onNotificationReceived", params);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {}
}