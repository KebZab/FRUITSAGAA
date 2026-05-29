import React, { Suspense, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import { getFruitModelSource } from './modelSources';

function useAssetUri(source) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let mounted = true;
    const asset = Asset.fromModule(source);

    asset.downloadAsync().then(() => {
      if (mounted) {
        setUri(asset.localUri || asset.uri || null);
      }
    });

    return () => {
      mounted = false;
    };
  }, [source]);

  return uri;
}

function FruitModel({ uri }) {
  const { scene } = useGLTF(uri);
  const groupRef = useRef(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={5.25} position={[0, -0.11, 0]} />
    </group>
  );
}

export default function Fruit3DViewer({ fruitId, style = {} }) {
  const uri = useAssetUri(getFruitModelSource(fruitId));

  return (
    <View style={[styles.container, style]}>
      {!uri ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackEmoji}>{fruitId === 'banana' ? '🍌' : '🍎'}</Text>
          <Text style={styles.fallbackText}>Loading 3D model…</Text>
        </View>
      ) : (
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 0, 2.8], fov: 42 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.8} />
          <directionalLight position={[3, 3, 5]} intensity={2.2} />
          <pointLight position={[-3, 3, 3]} intensity={0.8} />
          <Suspense fallback={null}>
            <FruitModel uri={uri} />
          </Suspense>
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 320,
    backgroundColor: '#FFF8FC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    position: 'relative',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    width: '100%',
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 12,
    color: '#999',
  },
});