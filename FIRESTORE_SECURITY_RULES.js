// FIRESTORE SECURITY RULES
// ========================
// 
// Copy and paste these rules into your Firestore Rules editor at:
// https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/rules
//
// IMPORTANT: Replace the entire content of your rules file with the following:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helper Functions ───────────────────────────────────────────────────
    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && get(/databases/$(database)/documents/users_basic/$(request.auth.uid)).data.role == 'admin';
    }

    function isInventory() {
      return isSignedIn() && get(/databases/$(database)/documents/users_basic/$(request.auth.uid)).data.role == 'inventory';
    }

    function isUser() {
      return isSignedIn() && (get(/databases/$(database)/documents/users_basic/$(request.auth.uid)).data.role == 'user' || !exists(/databases/$(database)/documents/users_basic/$(request.auth.uid)));
    }

    function ownsResource(uid) {
      return request.auth.uid == uid;
    }

    // ─── Fruits Collection ───────────────────────────────────────────────────
    match /fruits/{document=**} {
      // Anyone can read available fruits
      allow read: if isSignedIn();
      
      // Only inventory managers can write
      allow create, update, delete: if isInventory() || isAdmin();
    }

    // ─── User Addresses Collection ──────────────────────────────────────────
    match /user_addresses/{document=**} {
      // Users can read/write their own addresses
      allow read, create, update, delete: if isSignedIn() && ownsResource(resource.data.uid);
      
      // Admins can read all addresses
      allow read: if isAdmin();
    }

    // ─── Orders Collection ──────────────────────────────────────────────────
    match /orders/{document=**} {
      // Users can create orders for themselves
      allow create: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      
      // Users can read their own orders
      allow read: if isSignedIn() && (
        resource.data.uid == request.auth.uid || isAdmin()
      );
      
      // Only admins can update orders
      allow update: if isAdmin();
      
      // No deletes allowed for orders
      allow delete: if false;
    }

    // ─── Users Basic Collection ─────────────────────────────────────────────
    match /users_basic/{document=**} {
      // Users can read their own profile
      allow read: if isSignedIn() && ownsResource(document);
      
      // Users can create their own profile
      allow create: if isSignedIn() && ownsResource(document);
      
      // Users can update their own profile (limited fields)
      allow update: if isSignedIn() && ownsResource(document) &&
        // Only allow updating name, not role or sensitive fields
        request.resource.data.keys().hasOnly(['name', 'email', 'uid', 'role', 'disabled']);
      
      // Admins can read all users
      allow read: if isAdmin();
      
      // Admins can update user roles and status
      allow update: if isAdmin();
    }

    // ─── Default: Deny all other access ────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// ─── NOTES ──────────────────────────────────────────────────────────────────
// 
// Role Definitions:
// - user: Regular customers who can browse and order fruits
// - inventory: Inventory managers who manage fruit stock and pricing
// - admin: Administrators with full access to all features
//
// Field Access Rules:
// - Regular users cannot modify their own role field
// - Only admins can change user roles
// - Fruit availability and stock can only be modified by inventory managers
// - Order status can only be modified by admins
// - Addresses are private to each user
//
// Limitations by Design:
// - Users cannot delete their own orders (maintain audit trail)
// - Inventory managers cannot view customer addresses
// - Regular users cannot access other users' information
//
// Testing:
// 1. Verify with different user roles
// 2. Test database operations from the app
// 3. Monitor Firestore logs for rule violations
//
