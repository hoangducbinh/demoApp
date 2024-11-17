import { Customer, Order, Product } from '@/app/admin/types';
import { db } from './firebase';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  orderBy,
  arrayUnion,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { auth } from './firebase';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { LoginCredentials, AuthUser } from '@/app/admin/types';

// Thêm interface cho User
interface User {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: any;
}

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

export const addCustomer = async (customerData: Customer) => {
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

export const addProduct = async (productData: Product) => {
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

export const addOrder = async (orderData: Order) => {
  try {
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      date: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    
    // Cập nhật thông tin khách hàng
    if (orderData.customerId) {
      const customerRef = doc(db, 'customers', orderData.customerId);
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

export const updateOrderStatus = async (orderId: string, status: string, note: string) => {
  try {
    const user = await getCurrentUser();
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status,
      history: arrayUnion({
        status,
        note,
        date: new Date().toISOString(),
        updatedBy: user?.displayName || 'Admin'
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

export const addCategory = async (categoryName: string) => {
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

// Authentication
export const login = async ({ email, password }: LoginCredentials): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Lấy thông tin user từ Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    let userData = userDoc.data();
    
    // Nếu chưa có thông tin trong Firestore, tạo mới
    if (!userData) {
      const newUserData = {
        uid: user.uid,
        email: user.email,
        displayName:'Quản lý',
        role: 'admin'
      };
      await createOrUpdateUser(newUserData as Partial<User>);
      userData = newUserData;
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: userData.displayName
    };
  } catch (error: any) {
    console.error('Error logging in:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const logout = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: userData?.displayName
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Thêm function để tạo/cập nhật thông tin user trong Firestore
export const createOrUpdateUser = async (userData: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userData.uid!);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // Nếu document chưa tồn tại, tạo mới
    const userRef = doc(db, 'users', userData.uid!);
    await setDoc(userRef, {
      ...userData,
      role: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
};

// Helper function to get readable error messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Email không hợp lệ.';
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hóa.';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản với email này.';
    case 'auth/wrong-password':
      return 'Mật khẩu không đúng.';
    default:
      return 'Đã có lỗi xảy ra khi đăng nhập.';
  }
};

// Thêm hàm này để sử dụng ở cấp ứng dụng nếu cần
export const initializeAuthListener = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      callback({
        uid: user.uid,
        email: user.email,
        displayName: userData?.displayName
      });
    } else {
      callback(null);
    }
  });
}; 