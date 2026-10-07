import Dexie from 'dexie';

export const db = new Dexie('ShareTungDB');

// กำหนด Schema ตารางข้อมูล (IndexedDB)
db.version(1).stores({
  rooms: '++id, name, tag, pt, archived',
  expenses: '++id, roomId, d, note, cat, paid',
  settlements: '++id, roomId, d',
  settings: 'key, value' // สำหรับเก็บค่า me, activeRoomId, activeTab
});