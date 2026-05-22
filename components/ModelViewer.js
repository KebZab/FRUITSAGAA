import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function ModelViewer({ modelPath = '/gbl.glb' }) {
  const divRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => {
    // Only render on web
    if (Platform.OS !== 'web') {
      return;
    }

    const div = divRef.current;
    if (!div) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const width = 300;
    const height = 300;
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2.5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 0);
    
    // Clear previous children
    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }
    
    div.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    // Load model
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(10.5, 10.5, 10.5);
        scene.add(model);
        modelRef.current = model;
      },
      (progress) => {
        console.log('Model loading:', (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      if (div && renderer.domElement.parentNode === div) {
        div.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [modelPath]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return <div ref={divRef} style={styles.container} />;
}

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
    backgroundColor: 'transparent',
  },
};
