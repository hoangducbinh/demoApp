import { db } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const seedData = async () => {
  try {
    // Thêm khách hàng mẫu
    const customers = [
      {
        name: "Nguyễn Văn A",
        email: "nguyenvana@example.com",
        phone: "0123456789",
        type: "vip",
        status: "active",
        createdAt: serverTimestamp(),
        orderCount: 10,
        totalSpent: 1000000,
        address: "Hà Nội"
      },
      // Thêm các khách hàng khác...
    ];

    // Thêm sản phẩm mẫu
    const products = [
      {
        name: "Sản phẩm A",
        price: 100000,
        category: "Danh mục 1",
        createdAt: serverTimestamp()
      },
      // Thêm các sản phẩm khác...
    ];

    // Thêm danh mục mẫu
    const categories = [
      { name: "Danh mục 1" },
      { name: "Danh mục 2" },
      { name: "Danh mục 3" }
    ];

    // Thêm vào Firestore
    for (const customer of customers) {
      await addDoc(collection(db, 'customers'), customer);
    }

    for (const product of products) {
      await addDoc(collection(db, 'products'), product);
    }

    for (const category of categories) {
      await addDoc(collection(db, 'categories'), category);
    }

    console.log('Seeding completed!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

seedData(); 