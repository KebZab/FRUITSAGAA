import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function Fruit3DViewer({ fruitId, emoji = '🍎', style = {} }) {
  const divRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const animationIdRef = useRef(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

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
    
    const width = div.clientWidth || 400;
    const height = 280;
    
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 1.8;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true 
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff, 1);
    
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
    dirLight.position.set(3, 3, 3);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-3, 3, 3);
    scene.add(pointLight);

    // Load model
    const loader = new GLTFLoader();
    const modelPath = `/${fruitId}/${fruitId}.glb`;

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(6, 6, 6);
        model.position.set(0, 0, 0);
        scene.add(model);
        modelRef.current = model;
        setModelLoaded(true);
      },
      (progress) => {
        console.log(`Model ${fruitId} loading:`, (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.warn(`Model ${fruitId} failed to load from ${modelPath}:`, error.message);
        setModelFailed(true);
        setModelLoaded(false);
      }
    );

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (div && renderer.domElement.parentNode === div) {
        div.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [fruitId]);

  if (Platform.OS !== 'web') {
    return null;
  }

  // Always render the Three.js canvas
  // If model failed to load, show a blank container instead of emoji
  if (modelFailed) {
    return (
      <div
        style={{
          width: '100%',
          height: 280,
          borderRadius: 16,
          borderWidth: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          ...style,
        }}
      >
        <div style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
          Loading 3D model...
        </div>
      </div>
    );
  }

  return (
    <div
      ref={divRef}
      style={{
        width: '100%',
        height: 280,
        borderRadius: 16,
        borderWidth: 0,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        ...style,
      }}
    />
  );
}


