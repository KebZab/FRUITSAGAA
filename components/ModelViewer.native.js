import React, { Suspense, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import { LOGO_MODEL } from './modelSources';

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

function RotatingModel({ uri, scale = 2.8, position = [0, -0.15, 0] }) {
  const group = useRef(null);
  const { scene } = useGLTF(uri);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={scale} position={position} />
    </group>
  );
}

export default function ModelViewer({
  modelSource = LOGO_MODEL,
  style,
  height = 190,
  scale = 4.8,
  cameraZ = 2.8,
  position = [0, -0.12, 0],
}) {
  const uri = useAssetUri(modelSource);

  return (
    <View style={[styles.container, { height }, style]}>
      {!uri ? null : (
      <Canvas
        style={StyleSheet.absoluteFill}
        camera={{ position: [0, 0, cameraZ], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 3, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <RotatingModel uri={uri} scale={scale} position={position} />
        </Suspense>
      </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});