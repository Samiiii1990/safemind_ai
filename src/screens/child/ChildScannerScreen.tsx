import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Camera, CameraDevice } from 'react-native-vision-camera';
import { requestCameraPermission, checkCameraPermission } from '../../utils/permissions';

const ChildScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    console.log('🔵 Iniciando verificación de permisos...');
    async function getPermission() {
      // Primero verifica si ya tiene permiso
      const hasIt = await checkCameraPermission();
      console.log('🟡 Permiso actual:', hasIt);
      
      if (!hasIt) {
        // Si no, solicítalo
        const permission = await requestCameraPermission();
        console.log('🟢 Permiso solicitado:', permission);
        setHasPermission(permission);
      } else {
        setHasPermission(true);
      }
    }
    getPermission();
  }, []);

  const handleRetry = async () => {
    console.log('🔄 Reintentando...');
    setHasPermission(null);
    const permission = await requestCameraPermission();
    console.log('🟢 Permiso obtenido (retry):', permission);
    setHasPermission(permission);
  };

  // Mientras verifica permisos
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Verificando permisos...</Text>
      </View>
    );
  }

  // Si no hay permiso
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Permiso de cámara denegado</Text>
        <Text style={styles.subtext}>SafeMind necesita acceso a la cámara para escanear códigos QR</Text>
        <TouchableOpacity style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Solicitar permiso nuevamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Solo cuando hasPermission === true
  console.log('✅ Renderizando CameraView');
  return <CameraView />;
};

// Este componente SOLO se monta cuando hasPermission es true
const CameraView = () => {
  const [device, setDevice] = useState<CameraDevice | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    console.log('📷 Inicializando cámara...');
    async function setupCamera() {
      try {
        // Verifica permiso una vez más antes de acceder a la cámara
        const hasPermission = await checkCameraPermission();
        console.log('📷 Verificación final de permiso:', hasPermission);
        
        if (!hasPermission) {
          console.log('❌ No hay permiso para acceder a la cámara');
          return;
        }

        const devices = await Camera.getAvailableCameraDevices();
        console.log('📷 Dispositivos encontrados:', devices.length);
        const backCamera = devices.find((d) => d.position === 'back');
        console.log('📷 Back camera:', backCamera ? 'Encontrada' : 'No encontrada');
        
        if (backCamera) {
          setDevice(backCamera);
          setIsActive(true);
        }
      } catch (error) {
        console.error('❌ Error al inicializar cámara:', error);
      }
    }
    setupCamera();
  }, []);

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Inicializando cámara...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        codeScanner={{
          codeTypes: ['qr', 'ean-13'],
          onCodeScanned: (codes) => {
            if (codes.length > 0 && isActive) {
              console.log('📱 QR escaneado:', codes[0].value);
              setIsActive(false);
              // Aquí procesas el código QR
            }
          },
        }}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>Escanea el código QR del tutor</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ChildScannerScreen;