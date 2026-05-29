import React, { Suspense, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';
import { Asset } from 'expo-asset';
import { LOGO_MODEL } from './modelSources';

function useAssetUri(source) {
  const asset = useMemo(() => Asset.fromModule(source), [source]);
  return asset.localUri || asset.uri || null;
}

function RotatingModel({ source, scale = 1.8, position = [0, -0.1, 0] }) {
  const group = useRef(null);
  const uri = useAssetUri(source);
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

export default function ModelViewer({ modelSource = LOGO_MODEL, style, height = 220 }) {
  return (
    <View style={[styles.container, { height }, style]}>
      <Canvas
        style={StyleSheet.absoluteFill}
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 3, 5]} intensity={1.5} />
        <Suspense fallback={null}>
          <RotatingModel source={modelSource} />
        </Suspense>
      </Canvas>
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