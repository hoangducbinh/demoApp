import { db } from './firebase';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  where,
  orderBy,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';

// Customers
export const getCustomers = async () => {
  try {
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
};

export const addCustomer = async (customerData) => {
  try {
    const customersRef = collection(db, 'customers');
    const docRef = await addDoc(customersRef, {
      ...customerData,
      createdAt: serverTimestamp(),
      status: 'active',
      orderCount: 0,
      totalSpent: 0
    });
    return { id: docRef.id, ...customerData };
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};

// Products
export const getProducts = async () => {
  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const addProduct = async (productData) => {
  try {
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...productData };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

// Orders
export const getOrders = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
};

export const addOrder = async (orderData) => {
  try {
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      date: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    
    // Cập nhật thông tin khách hàng
    if (orderData.customer) {
      const customerRef = doc(db, 'customers', orderData.customer);
      await updateDoc(customerRef, {
        orderCount: arrayUnion(1),
        totalSpent: arrayUnion(orderData.total)
      });
    }
    
    return { id: docRef.id, ...orderData };
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status, note) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      history: arrayUnion({
        status,
        note,
        date: new Date().toISOString(),
        updatedBy: 'Admin' // Thay thế bằng user thật
      })
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

// Categories
export const getCategories = async () => {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const addCategory = async (categoryName) => {
  try {
    const categoriesRef = collection(db, 'categories');
    const docRef = await addDoc(categoriesRef, { 
      name: categoryName,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, name: categoryName };
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}; 