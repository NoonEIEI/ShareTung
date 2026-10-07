import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

// ===================== Helper Functions =====================
const today = () => new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const f = (n) => '฿' + Math.abs(Math.round(n * 100) / 100).toLocaleString('th-TH')
const other = (w) => (w === 'me' ? 'pt' : 'me')

// คำนวณสรุปยอดเงินคงเหลือ
function stats(room, roomExp = []) {
  let pm = 0, pp = 0, b = 0

  roomExp.forEach((e) => {
    const t = e.a + e.b
    if (e.paid === 'me') {
      pm += t
      b += e.b
    } else {
      pp += t
      b -= e.a
    }
  })

  const total = pm + pp
  const p = total > 0 ? Math.round((pm / total) * 100) : 50

  return { 
    pm, 
    pp, 
    b, 
    total, 
    p: total ? p : 50, 
    none: !total 
  }
}

// ===================== Footer ส่วนล่างตรงกลางทุกหน้า =====================
function PersistentFooter() {
  return (
    <footer className="w-full text-center py-6 mt-10 border-t border-zinc-200/80 flex flex-col items-center justify-center gap-1.5 pointer-events-auto">
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white shadow-lg border border-zinc-800 transition-all hover:scale-105">
        <span className="text-xs font-bold tracking-widest font-mono text-zinc-100">
          SUTTINAT KAEWDEE 66110124
        </span>
      </div>
    </footer>
  )
}

// ===================== Modals =====================
function Toast({ message }) {
  if (!message) return null
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-zinc-100 px-6 py-3 rounded-full text-xs font-medium tracking-wide shadow-2xl border border-zinc-800 font-mono">
      {message}
    </div>
  )
}

function pickImg(cb) {
  const i = document.createElement('input')
  i.type = 'file'
  i.accept = 'image/*'
  i.onchange = () => {
    const fl = i.files[0]
    if (!fl) return
    const r = new FileReader()
    r.onload = () => {
      const im = new Image()
      im.onload = () => {
        const k = Math.min(1, 700 / im.width)
        const c = document.createElement('canvas')
        c.width = im.width * k
        c.height = im.height * k
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height)
        cb(c.toDataURL('image/jpeg', 0.6))
      }
      im.src = r.result
    }
    r.readAsDataURL(fl)
  }
  i.click()
}

function SlipModal({ src, onClose }) {
  if (!src) return null
  return (
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-[440px] md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-auto shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold text-zinc-900 tracking-tight">หลักฐานสลิปการโอน</div>
        {typeof src === 'string' && src.startsWith('data:') ? (
          <img className="w-full max-h-[60vh] object-contain rounded-2xl mt-4 border border-zinc-100 bg-zinc-50" src={src} alt="slip" />
        ) : (
          <div className="text-center text-zinc-400 py-12 text-xs tracking-wide">ไม่มีรูปสลิปแนบไว้ในรายการนี้</div>
        )}
        <button onClick={onClose} className="w-full py-3.5 rounded-2xl bg-zinc-100 text-zinc-700 font-medium text-xs mt-6 hover:bg-zinc-200 transition">
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  )
}

function SettleModal({ me, pt, balance, onConfirm, onClose }) {
  const absB = Math.abs(balance)
  const to = balance > 0 ? 'me' : 'pt'
  const from = to === 'me' ? 'pt' : 'me'
  const [type, setType] = useState('full')
  const [customAmt, setCustomAmt] = useState(String(absB))
  const [slip, setSlip] = useState(null)
  const isFull = type === 'full'
  const payAmt = isFull ? absB : Math.min(absB, Math.max(0, parseFloat(customAmt) || 0))
  const remBal = absB - payAmt

  return (
    <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-[440px] md:max-w-lg rounded-t-3xl md:rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-auto shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
        <div className="text-base font-semibold text-zinc-900 tracking-tight">เคลียร์ยอดเงินในห้องนี้</div>
        <div className="text-xs text-zinc-500 mt-1">
          {from === 'me' ? me : pt} ต้องโอนให้ {to === 'me' ? me : pt} (ยอดค้างทั้งหมด {f(absB)})
        </div>

        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6 mb-2">รูปแบบการชำระ</div>
        <div className="grid grid-cols-2 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60">
          <button onClick={() => setType('full')}
            className={`py-2.5 rounded-xl text-xs font-medium transition ${isFull ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500'}`}>
            จ่ายเต็มจำนวน ({f(absB)})
          </button>
          <button onClick={() => setType('partial')}
            className={`py-2.5 rounded-xl text-xs font-medium transition ${!isFull ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500'}`}>
            จ่ายบางส่วน
          </button>
        </div>

        {!isFull && (
          <>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-5 mb-2">ระบุจำนวนเงิน (บาท)</div>
            <input type="number" className="w-full p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 text-center text-2xl font-bold text-zinc-900 font-mono focus:outline-none focus:border-zinc-900 focus:bg-white transition"
              value={customAmt} onChange={(e) => setCustomAmt(e.target.value)} />
          </>
        )}

        <div className="text-center bg-zinc-50 rounded-2xl p-4 mt-4 border border-zinc-100">
          <div className="text-xs text-zinc-500">ยอดชำระครั้งนี้: <span className="text-base font-bold text-zinc-900 font-mono">{f(payAmt)}</span></div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {remBal > 0
              ? <>ยอดคงเหลือหลังชำระ: <span className="font-semibold text-rose-600 font-mono">{f(remBal)}</span></>
              : 'ชำระครบถ้วน ไม่มียอดค้างชำระเหลือ'}
          </div>
        </div>

        {slip && <img className="w-full max-h-44 object-contain rounded-2xl mt-4 border border-zinc-100 bg-zinc-50" src={slip} alt="slip" />}
        
        <button
          onClick={() => pickImg((s) => setSlip(s))}
          className={`w-full py-3.5 rounded-2xl border border-dashed mt-4 text-xs font-medium transition ${
            slip ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
          }`}>
          {slip ? 'แนบสลิปเรียบร้อย (แตะเพื่อเปลี่ยน)' : 'แนบรูปหลักฐานการโอนเงิน'}
        </button>

        <button onClick={() => onConfirm(payAmt, isFull, slip)}
          className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-medium text-xs tracking-wide mt-5 hover:bg-zinc-800 active:scale-[0.99] transition shadow-xs">
          ยืนยันการเคลียร์ยอด
        </button>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl text-zinc-500 font-medium text-xs mt-1 hover:bg-zinc-100 transition">
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ===================== Main App =====================
export default function App() {
  useEffect(() => {
    const initSeedData = async () => {
      const count = await db.rooms.count()
      if (count === 0) {
        const room1Id = await db.rooms.add({ name: 'บ้านกับแฟน', tag: 'คู่รัก', pt: 'แฟน', archived: false })
        const room2Id = await db.rooms.add({ name: 'หอพักกับรูมเมท', tag: 'หอพัก', pt: 'เพชร', archived: false })

        await db.expenses.bulkAdd([
          { roomId: room1Id, d: '2 ต.ค.', paid: 'pt', a: 207.5, b: 207.5, mode: 'eq', note: 'มื้อเย็นสุกี้', cat: 'อาหาร', slip: true },
          { roomId: room1Id, d: '3 ต.ค.', paid: 'me', a: 625, b: 625, mode: 'eq', note: 'ค่าไฟเดือนนี้', cat: 'ของใช้/บ้าน', slip: true },
          { roomId: room2Id, d: '3 ต.ค.', paid: 'me', a: 150, b: 150, mode: 'eq', note: 'ค่าเน็ตหอ', cat: 'ของใช้/บ้าน', slip: false },
          { roomId: room2Id, d: '5 ต.ค.', paid: 'pt', a: 230, b: 230, mode: 'eq', note: 'ของใช้ในห้อง', cat: 'ของใช้/บ้าน', slip: false },
        ])

        await db.settings.bulkPut([
          { key: 'me', value: 'เรา' },
          { key: 'activeRoomId', value: null },
          { key: 'activeTab', value: 'home' },
        ])
      }
    }
    initSeedData()
  }, [])

  const rooms = useLiveQuery(() => db.rooms.toArray()) || []
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) || []
  const allSettlements = useLiveQuery(() => db.settlements.toArray()) || []
  const settings = useLiveQuery(() => db.settings.toArray()) || []

  const meSetting = settings.find((s) => s.key === 'me')
  const activeRoomSetting = settings.find((s) => s.key === 'activeRoomId')
  const activeTabSetting = settings.find((s) => s.key === 'activeTab')

  const me = meSetting ? meSetting.value : 'เรา'
  const roomId = activeRoomSetting ? activeRoomSetting.value : null
  const tab = activeTabSetting ? activeTabSetting.value : 'home'

  const room = rooms.find((r) => r.id === roomId)
  const exp = allExpenses.filter((e) => e.roomId === roomId)
  const sets = allSettlements.filter((s) => s.roomId === roomId)

  const [view, setView] = useState('main')
  const [toastMsg, setToastMsg] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [showSettle, setShowSettle] = useState(false)
  const [viewSlip, setViewSlip] = useState(null)

  const [form, setForm] = useState({
    paid: 'me', mode: 'eq', t: '', a: '', b: '', f: 't', note: '', cat: 'อาหาร', slip: null,
  })

  const pt = room?.pt || 'คู่หาร'

  const toast = useCallback((m) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(''), 2200)
  }, [])

  const setRoomId = async (id) => await db.settings.put({ key: 'activeRoomId', value: id })
  const setTab = async (t) => await db.settings.put({ key: 'activeTab', value: t })
  const setMeName = async (name) => await db.settings.put({ key: 'me', value: name })

  const openRoom = async (id) => {
    await setRoomId(id)
    await setTab('home')
    setView('main')
    setEditingId(null)
    window.scrollTo(0, 0)
  }

  const leaveRoom = async () => {
    await setRoomId(null)
    setView('main')
  }

  const bal = () => exp.reduce((n, e) => n + (e.paid === 'me' ? e.b : -e.a), 0)

  const deleteExp = async (id) => {
    if (!confirm('ยืนยันการลบรายการนี้?')) return
    await db.expenses.delete(id)
    toast('ลบรายการเรียบร้อยแล้ว')
  }

  const editExp = (id) => {
    const e = exp.find((x) => x.id === id)
    if (!e) return
    setEditingId(id)
    setForm({
      paid: e.paid, mode: e.mode,
      t: e.mode === 'eq' ? String(e.a + e.b) : '',
      a: String(e.a), b: String(e.b),
      f: e.mode === 'eq' ? 't' : 'a',
      note: e.note || '', cat: e.cat || 'อาหาร', slip: e.slip || null,
    })
    setView('add')
  }

  const saveExp = async () => {
    let a, b
    if (form.mode === 'eq') {
      const T = parseFloat(form.t)
      if (!T) { toast('โปรดระบุยอดรวมเงิน'); return }
      a = T / 2; b = T / 2
    } else {
      a = parseFloat(form.a) || 0; b = parseFloat(form.b) || 0
      if (a + b <= 0) { toast('โปรดระบุยอดของแต่ละคน'); return }
    }

    if (editingId) {
      await db.expenses.update(editingId, {
        paid: form.paid, a, b, mode: form.mode,
        note: form.note.trim(), cat: form.cat, slip: form.slip || false,
      })
      toast('บันทึกการแก้ไขเรียบร้อย')
    } else {
      await db.expenses.add({
        roomId, d: today(), paid: form.paid, a, b,
        mode: form.mode, note: form.note.trim(), cat: form.cat, slip: form.slip || false,
      })
      toast('บันทึกรายการเรียบร้อยแล้ว')
    }

    setEditingId(null)
    setView('main')
    await setTab('home')
  }

  const cancelSettle = async (setId) => {
    const s = sets.find((x) => x.id === setId)
    if (!s) return
    if (!confirm(`ปฏิเสธการเคลียร์ยอดจำนวน ${f(s.amt)} นี้?\n\nรายการบิลจะถูกย้อนกลับมาเป็นยอดค้างชำระตามเดิม`)) return

    await db.settlements.delete(setId)
    if (s.items && s.items.length) {
      const currentIds = exp.map((e) => e.id)
      await db.expenses.bulkDelete(currentIds)
      const restored = s.items.map(({ id, ...rest }) => ({ ...rest, roomId }))
      await db.expenses.bulkAdd(restored)
    }
    toast('ยกเลิกการเคลียร์ยอดและคืนรายการบิลเรียบร้อย')
  }

  const doSettle = async (payAmt, isFull, slip) => {
    const b = bal()
    const absB = Math.abs(b)
    if (payAmt <= 0) { toast('โปรดระบุจำนวนเงินที่ต้องการเคลียร์'); return }
    const snapshot = structuredClone(exp)

    if (payAmt >= absB) {
      await db.settlements.add({
        roomId, d: today(), amt: absB, from: b > 0 ? 'pt' : 'me', n: exp.length, slip: slip || false, items: snapshot, isPartial: false,
      })
      await db.expenses.bulkDelete(exp.map((e) => e.id))
      toast('เคลียร์ยอดเต็มจำนวนเรียบร้อย')
    } else {
      await db.settlements.add({
        roomId, d: today(), amt: payAmt, from: b > 0 ? 'pt' : 'me', n: exp.length, slip: slip || false, items: snapshot, isPartial: true, remBal: absB - payAmt,
      })

      let remPay = payAmt
      for (let e of exp) {
        if (remPay <= 0) break
        let newA = e.a
        let newB = e.b

        if (b > 0) {
          if (e.paid === 'me' && e.b > 0) {
            if (remPay >= e.b) { remPay -= e.b; newB = 0 } else { newB -= remPay; remPay = 0 }
          }
        } else {
          if (e.paid === 'pt' && e.a > 0) {
            if (remPay >= e.a) { remPay -= e.a; newA = 0 } else { newA -= remPay; remPay = 0 }
          }
        }

        if (newA === 0 && newB === 0) {
          await db.expenses.delete(e.id)
        } else {
          await db.expenses.update(e.id, { a: newA, b: newB })
        }
      }
      toast(`เคลียร์ยอดบางส่วน ${f(payAmt)} เรียบร้อย`)
    }
  }

  const createRoom = async () => {
    const name = prompt('ชื่อห้องใหม่')
    if (!name?.trim()) return
    const ptName = prompt('ชื่อคู่หารในห้องนี้') || 'คู่หาร'
    await db.rooms.add({ name: name.trim(), tag: 'ทั่วไป', pt: ptName.trim(), archived: false })
    toast('สร้างห้องใหม่เรียบร้อย')
  }

  const archiveRoom = async (id) => {
    const r = rooms.find((x) => x.id === id)
    if (!r) return
    await db.rooms.update(id, { archived: !r.archived })
  }

  const deleteRoom = async (id) => {
    if (!confirm('ยืนยันลบห้องนี้ถาวร?')) return
    await db.rooms.delete(id)
    await db.expenses.bulkDelete(allExpenses.filter((e) => e.roomId === id).map((e) => e.id))
    await db.settlements.bulkDelete(allSettlements.filter((s) => s.roomId === id).map((s) => s.id))
    if (roomId === id) leaveRoom()
    toast('ลบห้องเรียบร้อยแล้ว')
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white flex flex-col justify-between">
      <div className="w-full max-w-[440px] md:max-w-3xl lg:max-w-4xl mx-auto min-h-screen relative px-5 sm:px-8 pt-8 pb-32 md:pb-16 flex flex-col justify-between">
        <main className="flex-1">
          <Toast message={toastMsg} />

          {(!roomId || !room) && (
            <RoomsView
              rooms={rooms}
              allExpenses={allExpenses}
              me={me}
              onOpen={openRoom}
              onCreate={createRoom}
              onArchive={archiveRoom}
              onDelete={deleteRoom}
              onRenameMe={(name) => setMeName(name)}
            />
          )}

          {roomId && room && view === 'main' && (
            <>
              {tab === 'home' && (
                <HomeView
                  room={room} me={me} pt={pt} exp={exp}
                  onLeave={leaveRoom}
                  onAdd={() => {
                    setEditingId(null)
                    setForm({ paid: 'me', mode: 'eq', t: '', a: '', b: '', f: 't', note: '', cat: 'อาหาร', slip: null })
                    setView('add')
                  }}
                  onSettle={() => {
                    const b = bal()
                    if (Math.abs(b) < 0.01) { toast('ไม่มียอดค้างชำระ'); return }
                    setShowSettle(true)
                  }}
                  onShowSlip={setViewSlip}
                  onEdit={editExp}
                  onDelete={deleteExp}
                />
              )}
              {tab === 'list' && <ListView me={me} pt={pt} exp={exp} />}
              {tab === 'hist' && <HistView me={me} pt={pt} sets={sets} onCancel={cancelSettle} onShowSlip={setViewSlip} />}
              {tab === 'sum' && <SumView room={room} me={me} pt={pt} exp={exp} />}
              {tab === 'sett' && (
                <SettView
                  room={room} me={me}
                  onSave={async (rName, myName, ptName) => {
                    await db.rooms.update(roomId, { name: rName, pt: ptName })
                    await setMeName(myName)
                    toast('บันทึกการตั้งค่าเรียบร้อย')
                  }}
                  onDelete={() => deleteRoom(roomId)}
                />
              )}

              {/* Bottom Nav */}
              <nav className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none z-10 md:static md:pointer-events-auto md:mt-12 md:mb-4">
                <div className="w-full max-w-[440px] md:max-w-3xl lg:max-w-4xl bg-white/90 backdrop-blur-md border-t md:border md:rounded-2xl border-zinc-200/80 flex pt-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:py-2.5 pointer-events-auto shadow-2xl md:shadow-xs">
                  {[
                    { id: 'home', label: 'หน้าหลัก' },
                    { id: 'list', label: 'รายการ' },
                    { id: 'hist', label: 'ประวัติ' },
                    { id: 'sum', label: 'สรุป' },
                    { id: 'sett', label: 'ตั้งค่า' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex-1 text-xs py-2 font-medium tracking-wide transition ${
                        tab === t.id ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </nav>
            </>
          )}

          {roomId && view === 'add' && (
            <AddView
              me={me} pt={pt} form={form} setForm={setForm} editingId={editingId}
              onBack={() => { setView('main'); setEditingId(null) }}
              onSave={saveExp}
            />
          )}
        </main>

        {/* Footer แสดงผลตรงกลางด้านล่างในทุกๆ หน้า */}
        <PersistentFooter />

        {/* Modals */}
        {viewSlip && <SlipModal src={viewSlip} onClose={() => setViewSlip(null)} />}
        {showSettle && (
          <SettleModal
            me={me} pt={pt} balance={bal()}
            onClose={() => setShowSettle(false)}
            onConfirm={(payAmt, isFull, slip) => {
              doSettle(payAmt, isFull, slip)
              setShowSettle(false)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ===================== Sub Components =====================

function RoomsView({ rooms, allExpenses, me, onOpen, onCreate, onArchive, onDelete, onRenameMe }) {
  const active = rooms.filter((r) => !r.archived)
  const archived = rooms.filter((r) => r.archived)

  let getSum = 0, giveSum = 0
  active.forEach((r) => {
    const roomExps = allExpenses.filter((e) => e.roomId === r.id)
    const b = stats(r, roomExps).b
    if (b > 0) getSum += b
    else if (b < 0) giveSum += Math.abs(b)
  })
  const net = getSum - giveSum

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200 block w-max mb-1">
            SPLIT EXPENSES
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">ShareTung</h1>
        </div>
        <button
          onClick={() => { const n = prompt('ชื่อของคุณ', me); if (n?.trim()) onRenameMe(n.trim()) }}
          className="text-xs px-4 py-2 border border-zinc-200 rounded-full font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition shadow-2xs"
        >
          {me}
        </button>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">ยอดสุทธิภาพรวม</div>
        <div className={`text-4xl md:text-5xl font-bold my-3 tracking-tight font-mono ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {net >= 0 ? '+' : '-'}{f(net)}
        </div>
        <div className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mt-4 font-mono">
          {net >= 0
            ? `เมื่อเก็บเงินคืนและโอนเคลียร์ครบทุกห้องแล้ว คุณจะเหลือเงินติดกระเป๋าจริง ${f(net)}`
            : `เมื่อเก็บเงินคืนและโอนเคลียร์ครบทุกห้องแล้ว คุณจะต้องจ่ายออกสุทธิ ${f(Math.abs(net))}`}
        </div>
      </div>

      <div className="flex justify-between items-center mt-10 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">ห้องบันทึกการหาร</h2>
        <button onClick={onCreate} className="text-xs px-4 py-2 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition shadow-xs">
          สร้างห้องใหม่
        </button>
      </div>

      {active.length === 0 && (
        <div className="text-center text-zinc-400 py-16 text-xs tracking-wide">ยังไม่มีห้องหารเงิน สามารถกดสร้างห้องใหม่เพื่อเริ่มต้นใช้งาน</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {active.map((r) => {
          const roomExps = allExpenses.filter((e) => e.roomId === r.id)
          const st = stats(r, roomExps)
          return (
            <div
              key={r.id}
              className="bg-white border border-zinc-200/80 rounded-3xl p-6 shadow-2xs cursor-pointer hover:border-zinc-400 transition group"
              onClick={() => onOpen(r.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase bg-zinc-100 px-2.5 py-1 rounded-full">{r.tag}</span>
                <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-900 transition font-mono">เปิดห้อง →</span>
              </div>
              <div className="text-base font-bold text-zinc-900">{r.name}</div>
              <div className="text-xs font-semibold mt-2 font-mono">
                {st.none ? (
                  <span className="text-zinc-400">ยังไม่มีรายการ</span>
                ) : st.b > 0 ? (
                  <span className="text-emerald-700">จะได้คืน {f(st.b)}</span>
                ) : st.b < 0 ? (
                  <span className="text-rose-700">ต้องจ่าย {f(st.b)}</span>
                ) : (
                  <span className="text-zinc-400">ยอดเงินสมดุลแล้ว</span>
                )}
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100 justify-end">
                <button onClick={(e) => { e.stopPropagation(); onArchive(r.id) }}
                  className="text-[11px] text-zinc-400 font-medium hover:text-zinc-700 transition">
                  เก็บเข้ากรุ
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(r.id) }}
                  className="text-[11px] text-rose-600 font-medium hover:text-rose-800 transition">
                  ลบห้อง
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {archived.length > 0 && (
        <>
          <div className="mt-10 mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">ห้องที่เก็บเข้ากรุแล้ว</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {archived.map((r) => (
              <div key={r.id} className="bg-zinc-50 border border-zinc-200/60 rounded-2xl p-4 flex justify-between items-center opacity-70">
                <div className="font-medium text-xs text-zinc-700">{r.name}</div>
                <button onClick={() => onArchive(r.id)} className="text-[11px] text-zinc-900 font-semibold hover:underline">
                  นำกลับมาใช้งาน
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function HomeView({ room, me, pt, exp, onLeave, onAdd, onSettle, onEdit, onDelete, onShowSlip }) {
  const st = stats(room, exp)
  const balance = st.b

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <button onClick={onLeave}
          className="text-xs px-4 py-2 border border-zinc-200 rounded-full font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition">
          ← กลับหน้าหลัก
        </button>
        <div className="text-xs font-semibold tracking-wider text-zinc-500 uppercase font-mono">{room.tag} / {room.name}</div>
      </div>

      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
          {balance > 0 ? `${pt} ต้องโอนให้ ${me}` : balance < 0 ? `${me} ต้องโอนให้ ${pt}` : 'ยอดเงินสมดุลแล้ว'}
        </div>
        <div className={`text-4xl md:text-5xl font-bold my-3 tracking-tight font-mono ${
          balance === 0 ? 'text-zinc-400' : balance > 0 ? 'text-emerald-700' : 'text-rose-700'
        }`}>
          {f(balance)}
        </div>
        
        {/* สัดส่วนการจ่าย */}
        <div className="h-2 rounded-full bg-zinc-100 flex overflow-hidden mt-6">
          <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${st.p}%` }} />
          <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${100 - st.p}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-3 font-medium font-mono">
          <span>{me}: {f(st.pm)} ({st.p}%)</span>
          <span>{pt}: {f(st.pp)} ({100 - st.p}%)</span>
        </div>
      </div>

      {Math.abs(balance) > 0.01 && (
        <button onClick={onSettle}
          className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-medium text-xs tracking-wide mt-4 text-center shadow-xs hover:bg-zinc-800 transition font-mono">
          เคลียร์ยอดเงินในห้องนี้ 
        </button>
      )}

      <div className="flex justify-between items-center mt-10 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 font-mono">รายการล่าสุด</h2>
        <button onClick={onAdd}
          className="hidden md:inline-flex text-xs px-4 py-2 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition">
          + บันทึกรายการจ่าย
        </button>
      </div>

      {exp.length === 0 && <div className="text-center text-zinc-400 py-12 text-xs">ยังไม่มีรายการบันทึกในห้องนี้</div>}

      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {exp.slice().reverse().slice(0, 10).map((e) => {
          const debtor = other(e.paid)
          const v = debtor === 'me' ? e.a : e.b
          return (
            <div key={e.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs hover:border-zinc-300 transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-md mr-2">{e.cat || 'ทั่วไป'}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{e.d}</span>
                  <div className="font-semibold text-sm text-zinc-900 mt-1">{e.note || 'ไม่มีโน้ต'}</div>
                </div>
                <div className={`text-right font-bold text-sm font-mono ${debtor === 'me' ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {f(v)}
                  <div className="font-normal text-[10px] text-zinc-400 mt-0.5">{debtor === 'me' ? me : pt} ต้องคืน</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-100">
                <div className="text-[11px] text-zinc-400 font-mono">
                  {e.paid === 'me' ? me : pt} จ่ายรวม {f(e.a + e.b)}
                </div>
                <div className="flex gap-2">
                  {e.slip && typeof e.slip === 'string' && e.slip.startsWith('data:') && (
                    <button onClick={() => onShowSlip && onShowSlip(e.slip)} className="text-[11px] text-zinc-600 font-medium hover:underline">สลิป</button>
                  )}
                  <button onClick={() => onEdit(e.id)} className="text-[11px] text-zinc-600 font-medium hover:underline">แก้ไข</button>
                  <button onClick={() => onDelete(e.id)} className="text-[11px] text-rose-600 font-medium hover:underline">ลบ</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={onAdd}
        className="md:hidden fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-full bg-zinc-900 text-white text-xs font-medium tracking-wide shadow-2xl z-20 active:scale-95 transition">
        + บันทึกรายการจ่าย
      </button>
    </>
  )
}

function ListView({ me, pt, exp }) {
  return (
    <>
      <h1 className="text-base font-semibold uppercase tracking-wider text-zinc-400 mb-4 font-mono">รายการทั้งหมด</h1>
      {exp.length === 0 && <div className="text-center text-zinc-400 py-12 text-xs">ยังไม่มีรายการ</div>}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {exp.slice().reverse().map((e) => {
          const debtor = other(e.paid)
          const v = debtor === 'me' ? e.a : e.b
          return (
            <div key={e.id} className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex justify-between items-center">
              <div>
                <div className="font-semibold text-xs text-zinc-900">{e.note || 'ไม่มีโน้ต'}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{e.d} · หมวดหมู่ {e.cat}</div>
              </div>
              <div className={`font-bold text-xs font-mono ${debtor === 'me' ? 'text-rose-700' : 'text-emerald-700'}`}>{f(v)}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function HistView({ me, pt, sets, onCancel, onShowSlip }) {
  return (
    <>
      <h1 className="text-base font-semibold uppercase tracking-wider text-zinc-400 mb-4 font-mono">ประวัติการเคลียร์ยอด</h1>
      {sets.length === 0 && <div className="text-center text-zinc-400 py-12 text-xs">ยังไม่เคยมีประวัติการเคลียร์ยอดในห้องนี้</div>}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {sets.slice().reverse().map((s) => (
          <div key={s.id} className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-xs text-zinc-900">
                  {s.from === 'me' ? me : pt} โอนให้ {s.from === 'me' ? pt : me}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">{s.d} · {s.isPartial ? 'ชำระบางส่วน' : 'ชำระเต็มจำนวน'}</div>
              </div>
              <div className="font-bold text-sm text-zinc-900 font-mono">{f(s.amt)}</div>
            </div>
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-100">
              {s.slip && typeof s.slip === 'string' && s.slip.startsWith('data:') ? (
                <button onClick={() => onShowSlip && onShowSlip(s.slip)} className="text-[11px] text-zinc-600 font-medium hover:underline">ดูหลักฐานสลิป</button>
              ) : <span className="text-[11px] text-zinc-400">ไม่มีสลิปแนบ</span>}
              <button onClick={() => onCancel(s.id)} className="text-[11px] text-rose-600 font-medium hover:underline">
                ปฏิเสธและคืนบิล
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function SumView({ room, me, pt, exp }) {
  const cats = {}
  exp.forEach((e) => { cats[e.cat] = (cats[e.cat] || 0) + e.a + e.b })
  const tot = Object.values(cats).reduce((a, b) => a + b, 0) || 1

  return (
    <>
      <h1 className="text-base font-semibold uppercase tracking-wider text-zinc-400 mb-4 font-mono">สรุปค่าใช้จ่ายรวม</h1>
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">ยอดรวมค่าใช้จ่ายทั้งหมด</div>
        <div className="text-4xl md:text-5xl font-bold my-3 tracking-tight text-zinc-900 font-mono">{f(tot === 1 ? 0 : tot)}</div>
        <div className="flex gap-6 text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-100 font-mono">
          <span>{me}: <b className="text-zinc-900">{f(exp.reduce((n, e) => n + e.a, 0))}</b></span>
          <span>{pt}: <b className="text-zinc-900">{f(exp.reduce((n, e) => n + e.b, 0))}</b></span>
        </div>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-8 mb-4 font-mono">แยกตามหมวดหมู่</h2>
      {Object.keys(cats).length === 0 && <div className="text-center text-zinc-400 py-8 text-xs">ยังไม่มีข้อมูลรายการ</div>}
      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {Object.entries(cats).map(([c, v]) => (
          <div key={c} className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-zinc-900">{c}</span>
              <span className="font-bold text-zinc-900 font-mono">{f(v)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-zinc-900" style={{ width: `${(v / tot) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function SettView({ room, me, onSave, onDelete }) {
  const [rName, setRName] = useState(room.name)
  const [myName, setMyName] = useState(me)
  const [ptName, setPtName] = useState(room.pt)

  return (
    <>
      <h1 className="text-base font-semibold uppercase tracking-wider text-zinc-400 mb-4 font-mono">ตั้งค่าห้อง</h1>
      <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-xs max-w-lg">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">ชื่อห้อง</label>
        <input className="w-full p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 text-xs font-medium text-zinc-900 mb-5 focus:outline-none focus:border-zinc-900 focus:bg-white transition"
          value={rName} onChange={(e) => setRName(e.target.value)} maxLength={30} />
        
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">ชื่อของคุณ</label>
        <input className="w-full p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 text-xs font-medium text-zinc-900 mb-5 focus:outline-none focus:border-zinc-900 focus:bg-white transition"
          value={myName} onChange={(e) => setMyName(e.target.value)} maxLength={14} />
        
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">ชื่อคู่หารในห้องนี้</label>
        <input className="w-full p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 text-xs font-medium text-zinc-900 mb-6 focus:outline-none focus:border-zinc-900 focus:bg-white transition"
          value={ptName} onChange={(e) => setPtName(e.target.value)} maxLength={14} />
        
        <button
          onClick={() => { if (!rName.trim() || !myName.trim() || !ptName.trim()) return; onSave(rName.trim(), myName.trim(), ptName.trim()) }}
          className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-medium text-xs tracking-wide hover:bg-zinc-800 transition shadow-xs font-mono">
          บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      <button onClick={onDelete}
        className="w-full md:w-auto px-8 py-3.5 rounded-2xl text-rose-600 font-medium text-xs mt-6 hover:bg-rose-50 transition">
        ลบห้องนี้ถาวร
      </button>
    </>
  )
}

function AddView({ me, pt, form, setForm, editingId, onBack, onSave }) {
  const cats = ['อาหาร', 'ของใช้/บ้าน', 'เดินทาง', 'บันเทิง', 'อื่นๆ']
  const eq = form.mode === 'eq'
  const T = parseFloat(form.t) || 0
  const A = parseFloat(form.a) || 0
  const B = parseFloat(form.b) || 0

  const key = (k) => {
    let v = form[form.f] || ''
    if (k === 'ลบ') v = v.slice(0, -1)
    else if (k === '.') { if (v && !v.includes('.')) v += '.' }
    else if (v.length < 8) v += k
    setForm((p) => ({ ...p, [p.f]: v }))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack}
          className="text-xs px-4 py-2 border border-zinc-200 rounded-full font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition">
          ยกเลิก
        </button>
        <h1 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          {editingId ? 'แก้ไขรายการ' : 'บันทึกรายการใหม่'}
        </h1>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">ผู้โอนสำรองจ่ายก่อน</div>
      <div className="grid grid-cols-2 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 mb-5">
        {['me', 'pt'].map((w) => (
          <button key={w} onClick={() => setForm((p) => ({ ...p, paid: w }))}
            className={`py-2.5 rounded-xl text-xs font-medium transition ${
              form.paid === w ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500'
            }`}>
            {w === 'me' ? me : pt}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">รูปแบบการหาร</div>
      <div className="grid grid-cols-2 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/60 mb-5">
        <button onClick={() => setForm((p) => ({ ...p, mode: 'eq', f: 't' }))}
          className={`py-2.5 rounded-xl text-xs font-medium transition ${eq ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500'}`}>
          หารเท่ากัน (50 : 50)
        </button>
        <button onClick={() => setForm((p) => ({ ...p, mode: 'cu', f: 'a' }))}
          className={`py-2.5 rounded-xl text-xs font-medium transition ${!eq ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500'}`}>
          หารยอดไม่เท่ากัน
        </button>
      </div>

      {eq ? (
        <div className="bg-white border-2 border-zinc-900 rounded-3xl p-6 text-left shadow-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">ระบุยอดเงินรวม</div>
          <div className="text-4xl font-bold tracking-tight text-zinc-900 mt-1 font-mono">฿{form.t || '0'}</div>
          <div className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100 font-mono">
            {T ? <>หารคนละ <span className="font-bold text-zinc-900 font-mono">{f(T / 2)}</span></> : 'ป้อนยอดเงินรวมของบิล'}
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {['a', 'b'].map((fld) => (
              <button key={fld} onClick={() => setForm((p) => ({ ...p, f: fld }))}
                className={`bg-white border-2 rounded-2xl p-4 text-left transition ${form.f === fld ? 'border-zinc-900' : 'border-zinc-200'}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">ของ {fld === 'a' ? me : pt}</div>
                <div className="text-2xl font-bold text-zinc-900 mt-1 font-mono">฿{form[fld] || '0'}</div>
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-zinc-500 mt-3 font-mono">
            ยอดเงินรวมทั้งหมด <span className="font-bold text-zinc-900 font-mono">{f(A + B)}</span>
          </div>
        </div>
      )}

      <input className="w-full p-4 rounded-2xl border border-zinc-200 bg-white text-xs font-medium text-zinc-900 mt-5 focus:outline-none focus:border-zinc-900 transition"
        placeholder="ระบุโน้ต เช่น มื้อเย็น, ค่าไฟ, ของใช้"
        value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} />

      <div className="flex gap-2 flex-wrap mt-3">
        {cats.map((c) => (
          <button key={c} onClick={() => setForm((p) => ({ ...p, cat: c }))}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
              form.cat === c ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {form.slip && typeof form.slip === 'string' && form.slip.startsWith('data:') && (
        <img className="w-full max-h-40 object-contain rounded-2xl mt-4 border border-zinc-200 bg-zinc-50" src={form.slip} alt="slip" />
      )}
      
      <button
        type="button"
        onClick={() => {
          if (form.slip) {
            setForm((p) => ({ ...p, slip: null }))
          } else {
            pickImg((s) => setForm((p) => ({ ...p, slip: s })))
          }
        }}
        className={`w-full py-3.5 rounded-2xl border border-dashed mt-4 text-xs font-medium transition ${
          form.slip ? 'border-emerald-500 text-emerald-700 bg-emerald-50/30' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
        }`}>
        {form.slip ? 'แนบสลิปเรียบร้อย (แตะเพื่อนำออก)' : 'แนบรูปหลักฐานการโอน / บิล'}
      </button>

      <div className="grid grid-cols-3 gap-2 mt-6 max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'ลบ'].map((k) => (
          <button key={k} onClick={() => key(String(k))}
            className="py-3.5 bg-white border border-zinc-200/80 rounded-2xl text-base font-semibold text-zinc-900 hover:bg-zinc-50 active:scale-95 transition shadow-2xs font-mono">
            {k}
          </button>
        ))}
      </div>

      <button onClick={onSave}
        className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-medium text-xs tracking-wide mt-6 hover:bg-zinc-800 transition shadow-xs font-mono">
        {editingId ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}
      </button>
    </div>
  )
}