import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function Fruit3DViewer({ fruitId, size = 120 }) {
  const divRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
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
    
    // Use size prop for dimensions
    const width = size;
    const height = size;
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(width, height);
    // Set background to black
    renderer.setClearColor(0x000000, 1);
    
    // Clear previous children
    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }
    
    div.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 2, 2);
    scene.add(dirLight);

    // Load model based on fruitId
    // Path format: /models/fruitId.glb
    const modelPath = `/models/${fruitId}.glb`;
    
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.5, 1.5, 1.5);
        scene.add(model);
        modelRef.current = model;
      },
      (progress) => {
        // Model loading progress
        console.log(`Loading ${fruitId}:`, (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        // Fallback: if model not found, display a geometric shape
        console.warn(`Model not found for ${fruitId}, using placeholder`);
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        modelRef.current = sphere;
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
  }, [fruitId, size]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return <div ref={divRef} style={{ ...styles.container, width: size, height: size }} />;
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto',
    backgroundColor: '#000000',
    borderRadius: '8px',
  },
};
