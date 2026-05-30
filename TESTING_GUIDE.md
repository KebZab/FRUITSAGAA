# Fruit Saga Enhancement - Testing Guide

## Quick Start Testing

### 1. Run the Application

```bash
cd "c:\Users\Kevin\OneDrive\Desktop\Fruit Saga\fruitsaga\FRUITSAGAA"
expo start
# Press 'w' for web, 'a' for Android, or 'i' for iOS
```

### 2. Create Test Users

#### Test User 1: Regular Customer
1. Click "Register"
2. Email: `customer@test.com`
3. Password: `password123`
4. Name: `John Doe`
5. Register → Auto-assigned role: `user`

#### Test User 2: Inventory Manager
1. Register same way with different email: `inventory@test.com`
2. Go to Firestore Console
3. Find document in `users_basic/[inventory-user-id]`
4. Edit the document, change: `role: "inventory"`
5. Log out and back in

#### Test User 3: Admin
1. Register: `admin@test.com`
2. Go to Firestore
3. Find document in `users_basic/[admin-user-id]`
4. Change: `role: "admin"`

---

## Feature-Specific Testing

### Test 1: Inventory Management

**Scenario: Inventory manager adds and manages fruits**

**Steps:**
1. Log in as inventory manager
2. You should be directed to `InventoryDashboardScreen`
3. Click "➕ Add Fruit"
4. Fill in:
   - Name: "Strawberry"
   - Price: "90"
   - Stock: "50"
5. Click "Add"
6. ✅ Fruit appears in list

**Test 1.1: Edit Fruit**
1. Click on strawberry card to expand
2. Click "✏️ Edit"
3. Change price to 100
4. Click "Update"
5. ✅ Price updated in list

**Test 1.2: Update Stock**
1. Click strawberry card
2. Click "📦 Stock"
3. Enter "10" (to add 10 units)
4. Click "Update"
5. ✅ Stock increases by 10
6. Repeat with "-5" to decrease

**Test 1.3: Low Stock Warning**
1. Decrease stock to 8 units
2. ✅ "⚠️ Low Stock" badge appears
3. Increase stock to 15
4. ✅ Badge disappears

**Test 1.4: Disable Fruit**
1. Click fruit card
2. Click "🚫 Disable" button
3. ✅ Fruit marked as unavailable
4. Go to FruitShopScreen (as customer)
5. ✅ Fruit doesn't appear in shop
6. Return to inventory, click "✅ Enable"
7. ✅ Fruit reappears in shop

**Test 1.5: Delete Fruit**
1. Click fruit card
2. Click "🗑️ Delete"
3. Confirm deletion
4. ✅ Fruit removed from list

---

### Test 2: Address Management

**Scenario: User adds and manages delivery addresses**

**Steps:**
1. Log in as regular user
2. Go to Profile (📱 menu)
3. Scroll down to "Delivery Addresses"
4. Click "Manage Addresses"
5. Click "➕ Add Address"
6. Fill in form:
   - Label: "Home"
   - Full Name: "Juan Dela Cruz"
   - Phone: "09123456789"
   - Street: "123 Lacson St"
   - Barangay: "Barangay 12"
   - City: "Bacolod City"
   - Province: "Negros Occidental"
   - Postal Code: "6100"
7. Click "Add"
8. ✅ Address appears in list with "Default" badge

**Test 2.1: Add Second Address**
1. Click "➕ Add Address"
2. Fill with different data (label: "Office")
3. Click "Add"
4. ✅ Both addresses show in list

**Test 2.2: Set Default Address**
1. Click "⭐ Default" on Office address
2. ✅ "Default" badge moves to Office
3. Home address no longer has badge

**Test 2.3: Edit Address**
1. Click "✏️ Edit" on Home address
2. Change phone number
3. Click "Update"
4. ✅ Updated number displays

**Test 2.4: Delete Address**
1. Click "🗑️ Delete" on Office address
2. Confirm
3. ✅ Address removed
4. Home address auto-becomes default

---

### Test 3: Real-Time Fruit Updates

**Scenario: Verify fruits update in real-time as inventory changes**

**Setup:** Open 2 browser windows
- Window A: Logged in as inventory manager
- Window B: Logged in as customer on FruitShopScreen

**Steps:**
1. In Window A, add a new fruit: "Lemon" for ₱35, stock 20
2. ✅ In Window B, lemon appears within 1-2 seconds
3. In Window A, decrease stock to 5
4. ✅ In Window B, low-stock warning appears
5. In Window A, disable the lemon
6. ✅ In Window B, lemon disappears immediately
7. In Window A, enable lemon again
8. ✅ In Window B, lemon reappears

---

### Test 4: Stock Validation & Checkout

**Scenario: Test stock validation before order**

**Steps:**
1. Log in as customer
2. Create an address (if not done yet)
3. Go to FruitShop
4. Find a fruit with low stock (≤5 units)
5. Try to add more quantity than stock
   - Example: Stock is 3, try to add 5
6. Click "Check Cart"
7. Try to place order
8. ✅ Error message: "Insufficient stock available"
9. Remove excess from cart
10. Try again
11. ✅ Order places successfully

---

### Test 5: Price at Purchase Time

**Scenario: Verify prices don't change after order**

**Steps:**
1. As inventory manager, set Apple price to 50
2. As customer, browse shop
3. Add Apple to cart (shows ₱50)
4. As inventory manager (another window), change Apple price to 100
5. Return to customer window - cart shows ₱50 still
6. Complete the order
7. Go to admin dashboard
8. Open the order → see price was 50 at purchase ✅

---

### Test 6: Admin Dashboard Address Display

**Scenario: Admin sees customer addresses in orders**

**Steps:**
1. As customer, place an order
2. Log in as admin
3. Go to AdminDashboard
4. Find the order
5. Click to expand
6. ✅ See section: "Customer Information"
   - Name ✅
   - Email ✅
7. ✅ See section: "Delivery Address"
   - Full name ✅
   - Phone ✅
   - Street address ✅
   - Barangay ✅
   - City ✅
   - Province ✅
   - Postal code ✅

---

### Test 7: Role-Based Navigation

**Test 7.1: User Role**
1. Log in as customer
2. ✅ Directed to Home screen
3. No access to admin or inventory features

**Test 7.2: Inventory Role**
1. Log in as inventory manager
2. ✅ Directed to InventoryDashboard
3. Can't see admin features
4. Can access FruitShop menu item
5. Click FruitShop → can browse and add to cart
6. Try to checkout without address → error

**Test 7.3: Admin Role**
1. Log in as admin
2. ✅ Directed to AdminDashboard
3. Can see all orders
4. Can update order status
5. Can access menu and other features

---

### Test 8: Cart and Checkout Flow

**Scenario: Complete full checkout flow with address**

**Steps:**
1. Log in as customer with saved address
2. Go to FruitShop
3. Add multiple fruits to cart
4. Click "View Cart" (FAB or icon)
5. ✅ Cart shows:
   - All items with prices
   - Quantities
   - Individual subtotals
   - Total amount
6. ✅ Address selector shows default address
7. Click address selector to change
8. ✅ Modal shows all addresses
9. Select different address
10. Modal closes
11. Click "🎉 Place Order"
12. ✅ Success message with order ID
13. Click "View Orders"
14. ✅ Order appears with selected address

---

### Test 9: Out-of-Stock Behavior

**Scenario: Test shop behavior with out-of-stock fruits**

**Steps:**
1. As inventory manager, set a fruit stock to 0
2. As customer, refresh FruitShop
3. ✅ Fruit doesn't appear
4. As inventory manager, increase stock to 5
5. ✅ Fruit reappears in shop (within 1-2 seconds)

**Alternative:** Try buying when stock reaches exactly 1 unit
1. Multiple customers trying to buy same fruit
2. First customer buys → stock becomes 0
3. Second customer trying to order → stock validation fails
4. ✅ Error: "Insufficient stock available"

---

### Test 10: Profile Integration

**Scenario: Access address management from profile**

**Steps:**
1. Log in as customer
2. Go to Profile
3. ✅ See section: "Delivery Addresses"
4. Click "Manage Addresses" button
5. ✅ Directed to AddressManagementScreen
6. Can add/edit/delete/set default
7. Back to profile
8. ✅ Back button works correctly

---

## Data Validation Tests

### Test 11: Input Validation

**Fruit Creation:**
1. Try to add fruit with empty name
2. ✅ Error: "Please fill all fields"
3. Try with empty price
4. ✅ Error: "Please fill all fields"
5. Try with empty stock
6. ✅ Error: "Please fill all fields"

**Address Creation:**
1. Try to add address with empty fields
2. ✅ Error: "Please fill all fields"
3. Try with invalid postal code (non-numeric)
4. Should still allow (some regions use alphanumeric)

---

### Test 12: Real-Time Listener Tests

**Scenario: Verify real-time updates work**

**Steps:**
1. Open FruitShop
2. As inventory manager, add new fruit
3. ✅ Fruit appears without refresh (1-2 seconds)
4. Modify price
5. ✅ Price updates in real-time
6. Delete fruit
7. ✅ Disappears without refresh

**Address Updates:**
1. Open AddressManagementScreen
2. In another window, add address
3. ✅ Appears without refresh

---

## Error Handling Tests

### Test 13: Network Error Handling

**Steps:**
1. Turn off device internet
2. Try to add fruit (as inventory manager)
3. ✅ Error message displayed
4. Try to place order (as customer)
5. ✅ Error message displayed
6. Turn internet back on
7. Try again
8. ✅ Works correctly

---

### Test 14: Authorization Tests

**As Regular User:**
- ✅ Cannot access InventoryDashboard
- ✅ Cannot modify fruits
- ✅ Cannot see other users' addresses

**As Inventory Manager:**
- ✅ Cannot modify user roles
- ✅ Cannot access AdminDashboard
- ✅ Cannot update order status
- ✅ Cannot see customer addresses

**As Admin:**
- ✅ Can access all areas
- ✅ Cannot place orders as inventory/user
- ✅ Can view all orders and addresses

---

## Performance Tests

### Test 15: Load Time

**FruitShop with many fruits:**
1. Add 50+ fruits to database
2. Load FruitShop
3. ✅ Should load in < 5 seconds
4. Scroll through list
5. ✅ Smooth scrolling without lag

**Address list with many addresses:**
1. Add 20+ addresses to user
2. Open AddressManagementScreen
3. ✅ All load and display correctly

---

## Checklist Summary

### Inventory Features ✅
- [ ] Add fruit
- [ ] Edit fruit
- [ ] Delete fruit
- [ ] Update stock
- [ ] Update price
- [ ] Enable/disable fruit
- [ ] Low-stock warning
- [ ] Real-time updates

### Address Features ✅
- [ ] Add address
- [ ] Edit address
- [ ] Delete address
- [ ] Set default address
- [ ] Multiple addresses supported
- [ ] Address validation
- [ ] Real-time sync

### Shopping Features ✅
- [ ] Load fruits from Firestore
- [ ] Show availability status
- [ ] Stock validation before checkout
- [ ] Address selection required
- [ ] Price tracking at purchase
- [ ] Out-of-stock prevention
- [ ] Low-stock indicator

### Admin Features ✅
- [ ] View all orders
- [ ] See customer information
- [ ] View delivery addresses
- [ ] Update order status
- [ ] All order details visible

### Role-Based Access ✅
- [ ] User can't access inventory
- [ ] Inventory can't modify orders
- [ ] Admin has full access
- [ ] Proper navigation by role

---

## Troubleshooting Common Issues

**Fruits not loading:**
- Check Firestore 'fruits' collection exists
- Verify security rules allow read
- Check console for errors

**Address not saving:**
- Verify UID is correct
- Check security rules
- Try refresh

**Stock validation failing:**
- Ensure fruits collection has stock field
- Check validateStockForOrder function
- Verify stock numbers are correct

**Real-time updates not working:**
- Check internet connection
- Verify Firestore listeners are active
- Check console for listener errors

**Address not showing in checkout:**
- Ensure user has at least one address
- Check user ID saved correctly
- Verify security rules allow read

---

**Last Updated:** May 30, 2026
**Status:** Ready for Testing ✅
