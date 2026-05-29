Fixed the login crash and the small 3D models.

The REPLACE error was coming from `LoginScreen.js` calling `navigation.replace(Home)` after sign-in, before the navigator had switched to the authenticated stack. I removed that redirect and now the auth context drives the route change. I also kept the login model larger and centered by updating `ModelViewer.native.js` and `ModelViewer.web.js` plus the layout wrapper in `LoginLayout.js` so it no longer collides with the top-left edge.

For the fruit dashboard, I enlarged both mobile and web viewers in `Fruit3DViewerSimple.native.js` and `Fruit3DViewerSimple.web.js`, and widened the featured viewer area in `FruitShopScreen.js`. The Android bundle passed after the changes, so the fruit models should now show up on Expo Go instead of being tiny or missing.

Reload Expo Go with a full refresh so it picks up the new bundle.

Completed: Adjust login layout for safe area and spacing (5/5)
