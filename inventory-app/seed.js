const { init } = require('./db_lowdb');
const db = require('./db_lowdb');
const fs = require('fs');
init();

const instruments = [
  { category: 'Power Quality Analyzer', name: 'Power Quality Analyzer', brand: 'Fluke', model: 'Fluke 1775', serial: 'PQF01' },
  { category: 'Power Quality Analyzer', name: 'Power Quality Analyzer', brand: 'Fluke', model: 'Fluke 1775', serial: 'PQF02' },
  { category: 'Power Quality Analyzer', name: 'Power Quality Analyzer', brand: 'Hioki', model: 'Hioki PQ3100', serial: 'PQH03' },
  { category: 'Power Quality Analyzer', name: 'Power Quality Analyzer', brand: 'Krykard', model: 'Krykard ALM36', serial: 'PQK04' },
  { category: 'Power Logger', name: 'Power Logger', brand: 'Hioki', model: 'Hioki PW3360-20', serial: 'PWH05' },
  { category: 'Clamp Meter', name: 'Clamp Meter', brand: 'Hioki', model: 'Hioki CM3286-50', serial: 'PCH06' },
  { category: 'Clamp Meter', name: 'Clamp Meter', brand: 'Krykard', model: 'Krykard F409', serial: 'PCK07' },
  { category: 'Clamp Meter', name: 'Clamp Meter', brand: 'Hioki', model: 'Hioki CM3286-50', serial: 'PCH08' },
  { category: 'Clamp Meter', name: 'Clamp Meter', brand: 'Krykard', model: 'Krykard F409', serial: 'PCK09' },
  { category: 'Ultrasonic Water Flow Meter', name: 'Ultrasonic Water Flow Meter', brand: 'Acron', model: 'TR600H', serial: 'UWA10' },
  { category: 'Ultrasonic Water Flow Meter', name: 'Ultrasonic Water Flow Meter', brand: 'Flexim', model: 'F601', serial: 'UWF11' },
  { category: 'Air Flow Meter', name: 'Air Flow Meter', brand: 'VPS', model: 'VPS-R250-M100-D11-PN16', serial: 'AFV12' },
  { category: 'Acoustic Imager', name: 'Acoustic Imager', brand: 'Fluke', model: 'ii910', serial: 'ACF13' },
  { category: 'Acoustic Imager', name: 'Acoustic Imager', brand: 'Fluke', model: 'ii500', serial: 'ACF14' },
  { category: 'Flue Gas Analyzer', name: 'Flue Gas Analyzer', brand: 'Kane', model: '958', serial: 'FGK15' },
  { category: 'Flue Gas Analyzer', name: 'Flue Gas Analyzer', brand: 'Testo', model: '340', serial: 'FGT16' },
  { category: 'Vane Anemometer', name: 'Vane Anemometer', brand: 'Fluke', model: '925', serial: 'VAF17' },
  { category: 'Vane Anemometer', name: 'Vane Anemometer', brand: 'Fluke', model: '925', serial: 'VAF18' },
  { category: 'Temperature Logger', name: 'Temperature Logger', brand: 'Testo', model: '176T4', serial: 'TLT19' },
  { category: 'Lux Meter', name: 'Lux Meter', brand: 'Fluke', model: '941', serial: 'LXF20' },
  { category: 'Lux Meter', name: 'Lux Meter', brand: 'Fluke', model: '941', serial: 'LXF21' },
  { category: 'Steam Trap Tester', name: 'Steam Trap Tester', brand: 'UE Systems', model: '100-UP', serial: 'STU22' },
  { category: 'Digital Tachometer', name: 'Digital Tachometer', brand: 'Fluke', model: '931', serial: 'DTF23' },
  { category: 'Digital Tachometer', name: 'Digital Tachometer', brand: 'Fluke', model: '931', serial: 'DTF24' },
  { category: 'Thermal Imager', name: 'Thermal Imager', brand: 'Testo', model: '872', serial: 'THT25' },
  { category: 'Thermal Imager', name: 'Thermal Imager', brand: 'Testo', model: '883', serial: 'THT26' },
  { category: 'Indoor Air Quality Meter', name: 'Indoor Air Quality Meter', brand: 'Testo', model: 'IAQ Meter', serial: 'IAT27' },
  { category: 'Differential Pressure Logger & Pitot Tube', name: 'Differential Pressure Logger & Pitot Tube', brand: 'Testo', model: '510', serial: 'DPT28' }
];

const now = new Date();
const iso = d => d.toISOString();

(async ()=>{
  for (let i = 0; i < instruments.length; i++) {
    const it = instruments[i];
    const lastCal = new Date(now.getTime() - (30 * 24 * 3600 * 1000));
    const nextCal = new Date(now.getTime() + ((90 + (i % 30)) * 24 * 3600 * 1000));
    await db.insertInstrument({
      ...it,
      lastCalibrationDate: iso(lastCal),
      nextCalibrationDate: iso(nextCal)
    });
  }

  // create 4 demo users
  const existing = await db.getUsers();
  if (!existing || existing.length === 0) {
    const low = require('./db_lowdb');
    await low.init();
    const d = require('fs');
    // directly write users into data.json if empty
    const file = require('path').join(__dirname,'data.json');
    const data = JSON.parse(d.readFileSync(file,'utf8'));
    data.users = [ { id: 'u1', name: 'User 1' }, { id: 'u2', name: 'User 2' }, { id: 'u3', name: 'User 3' }, { id: 'u4', name: 'User 4' } ];
    d.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  console.log('Seed complete.');
})();
