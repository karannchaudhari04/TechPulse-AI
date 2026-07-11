import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { axiosClient } from '../api/axiosClient';

interface BootstrapScreenProps {
  onComplete: () => void;
}

export default function BootstrapScreen({ onComplete }: BootstrapScreenProps) {
  const [statusText, setStatusText] = useState('Initializing system...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const performBootstrap = async () => {
    setErrorMsg(null);
    setIsRetrying(true);

    try {
      // Check Backend Connectivity via Actuator Health Check
      setStatusText('Connecting to backend services...');
      const healthRes = await axiosClient.get('/actuator/health', { timeout: 7000 });
      if (healthRes.data && healthRes.data.status !== 'UP') {
        throw new Error('Backend systems are undergoing maintenance. Please try again later.');
      }

      setStatusText('Ready!');
      onComplete();
    } catch (error: any) {
      console.error('[Bootstrap] Service health verification failed:', error);
      setErrorMsg(
        error.message || 'Cannot establish connection to server. Please check your network connection.'
      );
    } finally {
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    performBootstrap();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/app_icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>TechPulse AI</Text>
      <Text style={styles.subtitle}>Developer Technology Intelligence</Text>

      {errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={performBootstrap}
            disabled={isRetrying}
          >
            <Text style={styles.buttonText}>{isRetrying ? 'Retrying...' : 'Retry Connection'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 48,
  },
  loaderContainer: {
    alignItems: 'center',
  },
  statusText: {
    color: '#E2E8F0',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
