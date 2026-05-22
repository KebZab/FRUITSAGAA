# 3D Models Integration Guide - FruitShop Screen

This guide explains how to integrate your 3D models into the Fruit Shop app.

## Current Setup

The FruitShopScreen currently has a **placeholder** for the 3D model display. The featured fruit section shows:
- Navigation arrows to browse fruits
- An emoji placeholder (using `modelPlaceholder` component)
- Add to cart functionality
- Interactive quantity controls

---

## Step-by-Step Integration Instructions

### 1. **Prepare Your 3D Model Files**

#### Supported Formats:
- **GLB** (Binary glTF) - Recommended ✅
  - Single file containing model + textures
  - Smaller file size
  - Better for mobile apps
  
- **OBJ** (Wavefront Object) - Alternative
  - Requires material file (.mtl)
  - Requires separate texture files
  - Larger file size

#### Recommended Specifications:
- **Polygon Count**: 10,000 - 50,000 polygons (balance between quality and performance)
- **File Size**: < 5MB per model (GLB format)
- **Texture Resolution**: 1024x1024 or 2048x2048
- **Format**: Embed textures in GLB for best results

### 2. **Organize Files in the Project**

Place your 3D models in: `assets/models3d/[fruit-name]/`

```
fruitsaga/assets/models3d/
├── apple/
│   ├── model.glb                 # 3D model file
│   └── model.png                 # Optional texture reference
├── banana/
│   └── model.glb
├── mango/
│   └── model.glb
├── strawberry/
│   └── model.glb
└── ...
```

**Fruit folder names must match the fruit IDs exactly:**
```javascript
// From FruitShopScreen.js FRUITS array:
{ id: 'apple', name: 'Apple', ... }        → assets/models3d/apple/
{ id: 'banana', name: 'Banana', ... }      → assets/models3d/banana/
{ id: 'mango', name: 'Mango', ... }        → assets/models3d/mango/
// etc...
```

---

## 3. **Replace the Placeholder Component**

### Current Placeholder Code

In `screens/FruitShopScreen.js`, find this section (around line 240):

```javascript
{/* 3D MODEL PLACEHOLDER */}
<View style={styles.fruitDisplayWrapper}>
  <View style={styles.modelPlaceholder}>
    <Text style={styles.modelPlaceholderEmoji}>{featuredFruit.emoji}</Text>
    <Text style={styles.modelPlaceholderText}>3D Model Placeholder</Text>
    <Text style={styles.modelPlaceholderHint}>
      {`See below for instructions\non adding 3D models`}
    </Text>
  </View>
</View>
```

### Option A: Using Expo's Three.js Integration (Recommended)

#### Step 1: Install required packages

```bash
cd fruitsaga
npm install expo-three three @react-three/fiber @react-three/rapier
# or
yarn add expo-three three @react-three/fiber @react-three/rapier
```

#### Step 2: Create a new 3D Viewer component

Create `components/Fruit3DViewerNative.js`:

```javascript
import React, { Suspense } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useGLTF } from '@react-three/drei/native';

// 3D Model Component
function FruitModel({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  
  return (
    <primitive
      object={scene}
      scale={[2, 2, 2]}
    />
  );
}

// Camera and Lighting Setup
function Scene({ modelPath }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <FruitModel modelPath={modelPath} />
      </Suspense>
    </>
  );
}

export default function Fruit3DViewerNative({ fruitId, style }) {
  const modelPath = require(`../assets/models3d/${fruitId}/model.glb`);
  
  return (
    <View style={style}>
      <Canvas>
        <Scene modelPath={modelPath} />
      </Canvas>
    </View>
  );
}
```

#### Step 3: Update FruitShopScreen.js

Replace the placeholder section with:

```javascript
import Fruit3DViewerNative from '../components/Fruit3DViewerNative';

// ... in the return JSX, replace the placeholder with:

<View style={styles.fruitDisplayWrapper}>
  <Fruit3DViewerNative 
    fruitId={featuredFruit.id}
    style={{ width: '100%', height: 280 }}
  />
</View>
```

---

### Option B: Using React Native 3D Viewer (Simpler Alternative)

If you prefer a simpler setup without Three.js:

#### Step 1: Install package

```bash
npm install react-native-3d-model-viewer
# or
yarn add react-native-3d-model-viewer
```

#### Step 2: Create wrapper component

Create `components/Fruit3DViewerSimple.js`:

```javascript
import React from 'react';
import { View } from 'react-native';
import ModelViewer from 'react-native-3d-model-viewer';

export default function Fruit3DViewerSimple({ fruitId, style }) {
  const modelPath = `${require(`../assets/models3d/${fruitId}/model.glb`)}`;
  
  return (
    <View style={style}>
      <ModelViewer
        model={modelPath}
        scale={1.5}
        autoPlay={true}
        autoRotate={true}
      />
    </View>
  );
}
```

#### Step 3: Use in FruitShopScreen.js

```javascript
import Fruit3DViewerSimple from '../components/Fruit3DViewerSimple';

// Replace placeholder:
<View style={styles.fruitDisplayWrapper}>
  <Fruit3DViewerSimple 
    fruitId={featuredFruit.id}
    style={{ width: '100%', height: 280 }}
  />
</View>
```

---

### Option C: Web-Based (Using babylon.js CDN)

If deploying as a web app:

```javascript
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function Fruit3DViewerWeb({ fruitId }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { margin: 0; overflow: hidden; }
        canvas { width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <canvas id="renderCanvas"></canvas>
      <script src="https://www.babylonjs-playground.com/babylon.js"></script>
      <script>
        const canvas = document.getElementById('renderCanvas');
        const engine = new BABYLON.Engine(canvas, true);
        const scene = new BABYLON.Scene(engine);
        
        // Add lighting
        const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.8;
        
        // Load model
        BABYLON.SceneLoader.ImportMesh('', '../assets/models3d/${fruitId}/', 'model.glb', scene, function(meshes) {
          const root = meshes[0];
          root.position = BABYLON.Vector3.Zero();
        });
        
        engine.runRenderLoop(function() {
          scene.render();
        });
        
        window.addEventListener('resize', function() {
          engine.resize();
        });
      </script>
    </body>
    </html>
  `;
  
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: htmlContent }}
      style={{ width: '100%', height: 280 }}
    />
  );
}
```

---

## 4. **Handle Dynamic Model Loading**

To avoid errors when 3D models don't exist yet, add error handling:

```javascript
import { View, Text } from 'react-native';

function Fruit3DViewer({ fruitId, style }) {
  const [modelExists, setModelExists] = React.useState(true);
  
  const handleError = () => {
    setModelExists(false);
  };
  
  if (!modelExists) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>3D model not available</Text>
      </View>
    );
  }
  
  return (
    // Your 3D viewer implementation
  );
}
```

---

## 5. **Performance Optimization**

### For Best Performance:

1. **Use GLB format** - Single file, already compressed
2. **Keep texture sizes reasonable** - 1024x1024 is usually sufficient
3. **Limit polygon count** - 10k-50k polygons per model
4. **Cache models** - Use React's `useMemo` hook
5. **Lazy load** - Load 3D viewer only when featured section is visible

### Example: Lazy Loading

```javascript
const Fruit3DViewer = React.lazy(() => 
  import('../components/Fruit3DViewerNative')
);

// In your component:
<Suspense fallback={<View style={{ height: 280 }} />}>
  <Fruit3DViewer fruitId={featuredFruit.id} style={{ ... }} />
</Suspense>
```

---

## 6. **Model Export Recommendations**

### Using Blender (Free)

1. **Create/Import your fruit model**
2. **Bake textures** (if needed) - Blender > Render > Bake
3. **Export as GLB**:
   - File > Export > glTF 2.0 (.glb/.gltf)
   - Check "Embed Textures"
   - Choose format: `.glb` (binary)
   - Export

### Using other tools:

- **Spline**: Export > Download GLB
- **SketchFab**: Download GLB format
- **Unity**: Select model > Export > FBX > Convert to GLB (using online converter)

---

## 7. **Testing Locally**

1. **Create test folder**: `assets/models3d/apple/`
2. **Add model file**: `model.glb` 
3. **Run app**: `npm start` or `expo start`
4. **Test in browser/emulator**: Should show 3D model instead of placeholder

---

## 8. **Troubleshooting**

### Model not showing:
- ✓ Verify file path matches fruit ID exactly
- ✓ Check file exists: `assets/models3d/[fruit-id]/model.glb`
- ✓ Ensure GLB file is not corrupted (try opening in online viewer)
- ✓ Check console for error messages

### Performance issues:
- ✓ Reduce polygon count in Blender
- ✓ Compress textures
- ✓ Use GLB format instead of OBJ
- ✓ Lower resolution for mobile devices

### Model appears too small/large:
- ✓ Adjust `scale` parameter in viewer
- ✓ Re-export with correct scale from modeling software

---

## Quick Reference: Current Placeholder Location

**File**: `screens/FruitShopScreen.js`  
**Lines**: ~240-250 (Featured Fruit Section)  
**Component**: `modelPlaceholder` in `fruitDisplayWrapper`

---

## Next Steps

1. ✅ Prepare your 3D models (GLB format recommended)
2. ✅ Create fruit folders in `assets/models3d/`
3. ✅ Choose integration option (A, B, or C)
4. ✅ Install required packages
5. ✅ Create viewer component
6. ✅ Replace placeholder in FruitShopScreen
7. ✅ Test and optimize

Good luck! 🎉
