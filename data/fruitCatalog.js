export const INVENTORY_COLLECTION = 'fruit_inventory';

export const FRUITS = [
  { id: 'apple', name: 'Apple', emoji: '🍎', price: 25, unit: '', description: 'Crisp & sweet red apple', defaultStock: 24 },
  { id: 'banana', name: 'Banana', emoji: '🍌', price: 12, unit: '', description: 'Ripe Lakatan banana', defaultStock: 36 },
  { id: 'mango', name: 'Mango', emoji: '🥭', price: 40, unit: '', description: 'Sweet Philippine carabao mango', defaultStock: 18 },
  { id: 'strawberry', name: 'Strawberry', emoji: '🍓', price: 90, unit: '', description: 'Fresh Baguio strawberries', defaultStock: 12 },
  { id: 'grapes', name: 'Grapes', emoji: '🍇', price: 120, unit: '', description: 'Seedless green grapes', defaultStock: 14 },
  { id: 'watermelon', name: 'Watermelon', emoji: '🍉', price: 60, unit: '', description: 'Chilled seedless watermelon', defaultStock: 10 },
  { id: 'orange', name: 'Orange', emoji: '🍊', price: 30, unit: '', description: 'Juicy navel orange', defaultStock: 28 },
  { id: 'pineapple', name: 'Pineapple', emoji: '🍍', price: 55, unit: '', description: 'Sweet Tagaytay pineapple', defaultStock: 16 },
  { id: 'blueberry', name: 'Blueberry', emoji: '🫐', price: 150, unit: '', description: 'Imported fresh blueberries', defaultStock: 8 },
  { id: 'lemon', name: 'Lemon', emoji: '🍋', price: 35, unit: '', description: 'Ripe native lemon', defaultStock: 22 },
];

export const FRUIT_MAP = Object.fromEntries(FRUITS.map((fruit) => [fruit.id, fruit]));
