export const LOGO_MODEL = require('../assets/models3d/Apple.glb');

export const FRUIT_MODEL_SOURCES = {
  apple: require('../assets/models3d/Apple.glb'),
  banana: require('../assets/models3d/Banana.glb'),
  mango: require('../assets/models3d/Mango.glb'),
  strawberry: require('../assets/models3d/Strawberry.glb'),
  grapes: require('../assets/models3d/Grapes.glb'),
  watermelon: require('../assets/models3d/Melon.glb'),
  orange: require('../assets/models3d/Orange.glb'),
  pineapple: require('../assets/models3d/Pineapple.glb'),
  blueberry: require('../assets/models3d/Blueberry.glb'),
  lemon: require('../assets/models3d/Lemon.glb'),
};

export function getFruitModelSource(fruitId) {
  return FRUIT_MODEL_SOURCES[fruitId] || LOGO_MODEL;
}