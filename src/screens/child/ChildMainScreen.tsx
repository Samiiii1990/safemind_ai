import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, DeviceEventEmitter, ActivityIndicator } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { analyzeRisk } from '../../AnalyzerAI';
import { isNoiseMessage } from '../../utils/filters';
import { requestCameraPermission, checkCameraPermission } from '../../utils/permissions';

const ChildMainScreen = () => {
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // 1. Verificar vinculación y permisos al iniciar
  useEffect(() => {
    const initialize = async () => {
      console.log('👶 Inicializando ChildMainScreen...');
      const id = await AsyncStorage.getItem('tutorId');
      setTutorId(id);
      
      // Solo pide permiso si NO está vinculado (necesita escanear)
      if (!id) {
        console.log('👶 No vinculado, solicitando permiso de cámara...');
        const permission = await requestCameraPermission();
        console.log('👶 Permiso obtenido:', permission);
        setHasPermission(permission);
      }
      
      setLoading(false);
    };
    initialize();
  }, []);

  // 2. Activar Escucha de Notificaciones (Solo si está vinculado)
  useEffect(() => {
    if (tutorId) {
      const subscription = DeviceEventEmitter.addListener(
        'onNotificationReceived',
        async (event) => {
          if (isNoiseMessage(event.message)) return;
          
          const analysis = await analyzeRisk(event.message);
          if (analysis.riskLevel >= 5) {
            await firestore().collection('alerts').add({
              tutorId: tutorId,
              message: event.message,
              riskLevel: analysis.riskLevel,
              groomingStage: analysis.groomingStage,
              timestamp: firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      );
      return () => subscription.remove();
    }
  }, [tutorId]);

  if (loading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  // --- VISTA A: ESCÁNER (Si no hay vínculo) ---
  if (!tutorId) {
    if (!hasPermission) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Permiso de cámara denegado</Text>
          <Text style={styles.errorSubtext}>Ve a Configuración para habilitar el permiso</Text>
        </View>
      );
    }
    
    return <QRScannerView onScanned={async (scannedId) => {
      await AsyncStorage.setItem('tutorId', scannedId);
      setTutorId(scannedId);
    }} />;
  }

  // --- VISTA B: ESCUDO (Si ya está vinculado) ---
  return (
    <View style={styles.shieldContainer}>
      <View style={styles.iconCircle}>
        <Text style={{fontSize: 60}}>🛡️</Text>
      </View>
      <Text style={styles.shieldTitle}>SafeMind AI Activado</Text>
      <Text style={styles.shieldStatus}>Protegiendo este dispositivo en tiempo real</Text>
      <View style={styles.linkedBadge}>
        <Text style={styles.linkedText}>Vinculado con: {tutorId.substring(0, 8)}...</Text>
      </View>
    </View>
  );
};

// Componente separado para el escáner QR
const QRScannerView = ({ onScanned }: { onScanned: (id: string) => void }) => {
  const [device, setDevice] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      console.log('📷 Configurando cámara...');
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        console.log('❌ No hay permiso de cámara');
        return;
      }

      const devices = await Camera.getAvailableCameraDevices();
      const backCamera = devices.find((d) => d.position === 'back');
      console.log('📷 Cámara trasera encontrada:', !!backCamera);
      
      if (backCamera) {
        setDevice(backCamera);
        setIsActive(true);
      }
    }
    setupCamera();
  }, []);

  if (!device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.scanSub}>Inicializando cámara...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.scanTitle}>Vincular con Tutor</Text>
        <Text style={styles.scanSub}>Apunta al código QR en el celular de tu padre/madre</Text>
      </View>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={{
          codeTypes: ['qr'],
          onCodeScanned: (codes) => {
            if (codes.length > 0 && codes[0].value && isActive) {
              console.log('📱 QR escaneado:', codes[0].value);
              setIsActive(false);
              onScanned(codes[0].value);
            }
          },
        }}
      />
      <View style={styles.scannerFrame} />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { position: 'absolute', top: 60, width: '100%', zIndex: 1, alignItems: 'center', padding: 20 },
  scanTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  scanSub: { color: 'white', textAlign: 'center', marginTop: 10 },
  scannerFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '35%',
    borderWidth: 2,
    borderColor: '#2ecc71',
    borderRadius: 20,
    backgroundColor: 'transparent'
  },
  shieldContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' },
  iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  shieldTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginTop: 30 },
  shieldStatus: { fontSize: 16, color: '#7f8c8d', marginTop: 10 },
  linkedBadge: { marginTop: 40, padding: 10, backgroundColor: '#d1fae5', borderRadius: 20 },
  linkedText: { color: '#065f46', fontSize: 12, fontWeight: 'bold' },
  errorText: { fontSize: 18, color: '#e74c3c', fontWeight: 'bold', marginBottom: 10 },
  errorSubtext: { fontSize: 14, color: '#7f8c8d', textAlign: 'center' },
});

export default ChildMainScreen;