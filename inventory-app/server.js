const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const ExcelJS = require('exceljs');
const db = require('./db_lowdb');

db.init();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  console.log('socket connected');
});

async function broadcastUpdate() {
  try {
    const instruments = await db.getInstruments();
    io.emit('instruments', instruments);
  } catch (err) {
    console.error('broadcastUpdate error', err);
  }
}

app.get('/api/instruments', async (req, res) => {
  const instruments = await db.getInstruments();
  res.json(instruments);
});

app.post('/api/instruments', async (req, res) => {
  // Accept full instrument object (including learning fields and file URLs)
  const payload = req.body || {};
  payload.location = payload.location || 'warehouse';
  // normalize productImages if provided as comma-separated string
  if (payload.productImages && typeof payload.productImages === 'string'){
    payload.productImages = payload.productImages.split(',').map(s=>s.trim()).filter(Boolean);
  }
  const info = await db.insertInstrument(payload);
  broadcastUpdate();
  res.json({ id: info.id });
});

app.put('/api/instruments/:id', async (req, res) => {
  const id = req.params.id;
  const payload = req.body || {};
  if (payload.productImages && typeof payload.productImages === 'string'){
    payload.productImages = payload.productImages.split(',').map(s=>s.trim()).filter(Boolean);
  }
  await db.updateInstrument(id, payload);
  broadcastUpdate();
  res.json({ ok: true });
});

app.delete('/api/instruments/:id', async (req, res) => {
  const id = req.params.id;
  await db.deleteInstrument(id);
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/users', async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
});

app.post('/api/book', async (req, res) => {
  const { userId, instrumentId, days=7, remarks } = req.body;
  const inst = await db.getInstrumentById(instrumentId);
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });
  if (inst.status === 'booked') return res.status(400).json({ error: 'Instrument already booked' });

  const start = new Date();
  const due = new Date(start.getTime() + days*24*3600*1000);
  await db.insertBooking({ userId, instrumentId, startDate: start.toISOString(), dueDate: due.toISOString(), remarks });
  await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
  broadcastUpdate();

  // emit previous insight to the booking user
  try {
    const prev = inst.lastInsight || '';
    io.emit('insight', { toUserId: userId, items: [{ instrumentId, instrumentName: inst.name, insight: prev }] });
  } catch (err) { console.error('emit insight error', err); }

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Booking');
    sheet.addRow(['SNo','Instrument Name','Model','Serial','Booked By','Start Date','Due Date','Previous Insight','Remarks']);
    const users = await db.getUsers();
    const user = users.find(u=>u.id===userId) || { name: userId };
    const prev = inst.lastInsight || '';
    sheet.addRow([1, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, remarks || '']);
    const fileName = `booking-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, 'public', fileName);
    await workbook.xlsx.writeFile(filePath);
    res.json({ ok: true, sheet: `/` + fileName });
  } catch (err) {
    console.error('Failed to generate booking sheet', err);
    res.json({ ok: true });
  }
});

app.post('/api/book/bulk', async (req, res) => {
  const { userId, instrumentIds = [], days = 7, remarks } = req.body;
  const users = await db.getUsers();
  const user = users.find(u=>u.id===userId) || { name: String(userId) };
  const start = new Date();
  const due = new Date(start.getTime() + days*24*3600*1000);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bookings');
  sheet.addRow(['SNo','Instrument Name','Model','Serial','Booked By','Start Date','Due Date','Previous Insight','Remarks']);
  let idx = 1;
  const itemsForNotification = [];
  for (const instrumentId of instrumentIds) {
    try {
      const inst = await db.getInstrumentById(instrumentId);
      if (!inst) continue;
      if (inst.status === 'booked') continue;
      await db.insertBooking({ userId, instrumentId, startDate: start.toISOString(), dueDate: due.toISOString(), remarks });
      await db.updateInstrument(instrumentId, { status: 'booked', location: 'with_user' });
      const prev = inst.lastInsight || '';
      sheet.addRow([idx++, inst.name, inst.model, inst.serial, user.name, start.toISOString(), due.toISOString(), prev, remarks || '']);
      itemsForNotification.push({ instrumentId, instrumentName: inst.name, insight: prev });
    } catch (err) {
      console.error('bulk book error for', instrumentId, err);
    }
  }
  broadcastUpdate();
  try {
    if (itemsForNotification.length) io.emit('insight', { toUserId: userId, items: itemsForNotification });
  } catch (err) { console.error('emit bulk insight error', err); }
  // add a calibration reminders sheet for items due within 15 days
  try {
    const calSheet = workbook.addWorksheet('CalibrationDue');
    calSheet.addRow(['SNo','Instrument Name','Model','Serial','Next Calibration Date','Days Left']);
    const all = await db.getInstruments();
    const now = new Date();
    const cutoff = new Date(now.getTime() + 15*24*3600*1000);
    let cidx = 1;
    all.forEach(i=>{
      if (i.nextCalibrationDate){
        const nd = new Date(i.nextCalibrationDate);
        if (nd >= now && nd <= cutoff){
          const daysLeft = Math.ceil((nd - now)/(24*3600*1000));
          calSheet.addRow([cidx++, i.name, i.model, i.serial, i.nextCalibrationDate, daysLeft]);
        }
      }
    });
    // summary sheet
    const sum = workbook.addWorksheet('Summary');
    sum.addRow(['TotalBooked', instrumentIds.length]);
    sum.addRow(['BookedBy', user.name]);
    sum.addRow(['StartDate', start.toISOString()]);
    sum.addRow(['DueDate', due.toISOString()]);
    sum.addRow(['Remarks', remarks || '']);
  } catch (err) {
    console.error('failed to add calibration sheet', err);
  }
  try {
    const fileName = `booking-${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, 'public', fileName);
    await workbook.xlsx.writeFile(filePath);
    res.json({ ok: true, sheet: '/' + fileName });
  } catch (err) {
    console.error('Failed to generate bulk booking sheet', err);
    res.json({ ok: true });
  }
});

app.post('/api/return', async (req, res) => {
  const { instrumentId, remarks } = req.body;
  const booking = await db.findActiveBookingByInstrument(instrumentId);
  if (!booking) return res.status(404).json({ error: 'Active booking not found' });
  const returnedDate = new Date().toISOString();
  await db.returnBooking(booking.id, returnedDate, remarks);
  await db.updateInstrument(instrumentId, { status: 'available', location: 'warehouse' });
  broadcastUpdate();
  res.json({ ok: true });
});

app.post('/api/return/bulk', async (req, res) => {
  const { instrumentIds = [], remarks } = req.body;
  for (const instrumentId of instrumentIds) {
    try {
      const booking = await db.findActiveBookingByInstrument(instrumentId);
      if (!booking) continue;
      const returnedDate = new Date().toISOString();
      await db.returnBooking(booking.id, returnedDate, remarks);
      await db.updateInstrument(instrumentId, { status: 'available', location: 'warehouse' });
      // store last insight if provided
      if (remarks && remarks.length) await db.setInstrumentInsight(instrumentId, remarks);
    } catch (err) {
      console.error('bulk return error for', instrumentId, err);
    }
  }
  broadcastUpdate();
  res.json({ ok: true });
});

app.get('/api/calibration/due', async (req, res)=>{
  const days = Number(req.query.days) || 15;
  const rows = await db.getInstrumentsDueForCalibration(days);
  res.json(rows);
});

app.post('/api/instrument/insight', async (req, res)=>{
  const { instrumentId, insight } = req.body;
  if(!instrumentId) return res.status(400).json({ error: 'instrumentId required' });
  await db.setInstrumentInsight(instrumentId, insight || '');
  res.json({ ok: true });
});

app.get('/api/bookings', async (req, res) => {
  const rows = await db.getBookings();
  const users = await db.getUsers();
  const instruments = await db.getInstruments();
  const result = rows.map(b => ({ ...b, userName: (users.find(u=>u.id===b.userId)||{}).name, instrumentName: (instruments.find(i=>i.id===b.instrumentId)||{}).name, instrumentModel: (instruments.find(i=>i.id===b.instrumentId)||{}).model, instrumentSerial: (instruments.find(i=>i.id===b.instrumentId)||{}).serial }));
  res.json(result.sort((a,b)=> new Date(b.startDate)-new Date(a.startDate)));
});

app.get('/api/calibrations', async (req, res) => {
  const instruments = await db.getInstruments();
  const rows = instruments.map(i => {
    const next = i.nextCalibrationDate || null;
    const dueIn = next ? (new Date(next) - new Date()) : null;
    return { ...i, dueInMilliseconds: dueIn };
  });
  res.json(rows);
});

app.post('/api/calibrate', async (req, res) => {
  // Accept optional calibration certificate URL and cycle days from frontend
  const { instrumentId, byUserId, certificateUrl, cycleDays } = req.body;
  if(!instrumentId) return res.status(400).json({ error: 'instrumentId required' });
  const now = new Date();
  const days = Number(cycleDays) || 365;
  const next = new Date(now.getTime() + days*24*3600*1000);
  const update = {
    lastCalibrationDate: now.toISOString(),
    nextCalibrationDate: next.toISOString(),
    calibrationCycleDays: days
  };
  if (certificateUrl) update.calibrationCertificateUrl = certificateUrl;
  await db.updateInstrument(instrumentId, update);
  // optionally record who performed it (not persisted separately currently)
  broadcastUpdate();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on', PORT));
