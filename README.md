# ShareTung (React + Vite + Tailwind + PWA)

## วิธีติดตั้ง

1. คัดลอกไฟล์ `App.jsx` ไปไว้ที่ `src/App.jsx`
2. ตรวจสอบว่า `src/main.jsx` import App ถูกต้อง
3. รันคำสั่ง:

```bash
npm install
npm run dev
```

## ฟีเจอร์ที่แปลงมาจาก prototype.html

- Dashboard สภาพคล่องสุทธิ
- ระบบห้อง (สร้าง / Archive / ลบ)
- บันทึกรายการจ่าย + Custom Numpad
- หารครึ่ง / ยอดไม่เท่ากัน
- เคลียร์ยอด (เต็ม / บางส่วน)
- Rollback / ปฏิเสธสลิป ดึงบิลกลับ
- ประวัติ + สรุปหมวดหมู่
- เก็บข้อมูลใน LocalStorage
- พร้อมใช้กับ vite-plugin-pwa

## โครงสร้างหลัก

- `App.jsx` – รวม logic ทั้งหมดของ ShareTung
- ใช้ Tailwind สำหรับ styling
- State จัดการด้วย React Hooks
- ข้อมูลเดิมจาก localStorage key `sharetang-pwa-v5` ใช้ต่อได้เลย
