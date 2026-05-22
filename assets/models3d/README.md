# 3D Fruit Models

This folder contains 3D models for the fruits in the Fruit Shop.

## Structure
- Each fruit should have its own folder named after the fruit (e.g., `apple/`, `banana/`, etc.)
- Each fruit folder should contain:
  - `model.glb` - The 3D model file in GLB format (recommended)
  - Or `model.obj` - The 3D model file in OBJ format (alternative)
  - Optional: `model.mtl` - Material file (if using OBJ)
  - Optional: `model.png` - Texture file

Example structure:
```
assets/models3d/
├── apple/
│   ├── model.glb
│   └── model.mtl
├── banana/
│   ├── model.glb
│   └── model.mtl
└── mango/
    ├── model.glb
    └── model.mtl
```

## How to Add 3D Models

See the FruitShopScreen.js file for integration instructions.
