import { onDocumentCreated } from "firebase-functions/v2/firestore"; // Usamos V2
import * as admin from "firebase-admin";

admin.initializeApp();

export const sendriskalert = onDocumentCreated("alerts/{alertId}", async (event) => {
  const newValue = event.data?.data(); // En V2 los datos están en event.data
  if (!newValue) return null;

  const riskLevel: number = newValue.riskLevel;
  const tutorId: string = newValue.tutorId;

  if (riskLevel >= 5) {
    try {
      const userDoc = await admin.firestore().collection("users").doc(tutorId).get();
      const userData = userDoc.data();

      if (!userDoc.exists || !userData?.fcmToken) {
        console.log(`Tutor ${tutorId} sin token.`);
        return null;
      }

      const message = {
        notification: {
          title: riskLevel >= 7 ? "🚨 ALERTA CRÍTICA" : "⚠️ AVISO PREVENTIVO",
          body: `Riesgo detectado nivel ${riskLevel}.`,
        },
        token: userData.fcmToken, // Formato V2 más directo
      };

      await admin.messaging().send(message);
      console.log(`Notificación enviada a: ${tutorId}`);
    } catch (error) {
      console.error("Error en notificación:", error);
    }
  }
  return null;
});