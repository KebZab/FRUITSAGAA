import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Asset } from 'expo-asset';
import { LOGO_MODEL } from './modelSources';

function useAssetUri(source) {
  const asset = useMemo(() => Asset.fromModule(source), [source]);
  return asset.uri || asset.localUri || null;
}

export default function ModelViewer({ modelSource = LOGO_MODEL }) {
  const divRef = useRef(null);
  const modelRef = useRef(null);
  const uri = useAssetUri(modelSource);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const div = divRef.current;
    if (!div || !uri) return;

    const scene = new THREE.Scene();
    const width = 300;
    const height = 300;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 0);

    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }

    div.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    loader.load(
      uri,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(10.5, 10.5, 10.5);
        scene.add(model);
        modelRef.current = model;
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (div && renderer.domElement.parentNode === div) {
        div.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [uri]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return <div ref={divRef} style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
});