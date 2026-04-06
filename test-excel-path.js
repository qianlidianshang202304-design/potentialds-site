const fs = require('fs');
const path = 'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.xlsx';

console.log('Checking file existence with forward slashes...');
if (fs.existsSync(path)) {
  console.log('File exists');
  const stats = fs.statSync(path);
  console.log('File size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
  
  try {
    console.log('\nTrying with xlsx - basic read...');
    const XLSX = require('xlsx');
    
    // Try reading with binary string
    const data = fs.readFileSync(path);
    console.log('File read as buffer successfully');
    
    // Try parsing the buffer
    const workbook = XLSX.read(data, { type: 'buffer' });
    console.log('Workbook parsed successfully');
    console.log('Sheet names:', workbook.SheetNames);
    
    if (workbook.SheetNames.length > 0) {
      const sheetName = workbook.SheetNames[0];
      console.log('Sheet name:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      
      // Try to get some cell data
      console.log('\nTrying to read cells...');
      const cellA1 = worksheet['A1'];
      const cellB1 = worksheet['B1'];
      const cellC1 = worksheet['C1'];
      
      console.log('A1:', cellA1 ? cellA1.v : 'empty');
      console.log('B1:', cellB1 ? cellB1.v : 'empty');
      console.log('C1:', cellC1 ? cellC1.v : 'empty');
    }
    
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Stack:', e.stack);
  }
} else {
  console.log('File does not exist');
}

// Try with different path formats
console.log('\nTrying different path formats...');
const paths = [
  'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.xlsx',
  'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx',
  'D:/达人库/1. TT/',
];

paths.forEach(p => {
  try {
    const exists = fs.existsSync(p);
    console.log(`Path "${p}" exists:`, exists);
    if (exists) {
      const stats = fs.statSync(p);
      console.log(`  Is directory:`, stats.isDirectory());
      console.log(`  Size:`, stats.size);
    }
  } catch (e) {
    console.log(`Error with path "${p}":`, e.message);
  }
});
