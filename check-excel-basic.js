const XLSX = require('xlsx');
const path = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';
const fs = require('fs');

try {
  // Check if file exists
  if (!fs.existsSync(path)) {
    console.error('File does not exist:', path);
    process.exit(1);
  }
  
  // Check file size
  const stats = fs.statSync(path);
  console.log('File size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
  
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(path, { cellDates: true, cellText: false });
  
  console.log('Sheet names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log('\nSheet:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    if (worksheet['!ref']) {
      console.log('Range:', worksheet['!ref']);
    }
    
    // Try to get first few cells
    try {
      console.log('First few cells:');
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 10; c++) {
          const cellAddress = XLSX.utils.encode_cell({ c, r });
          const cell = worksheet[cellAddress];
          if (cell) {
            process.stdout.write(`${cellAddress}: ${cell.v}\t`);
          }
        }
        process.stdout.write('\n');
      }
    } catch (e) {
      console.log('Error reading cells:', e.message);
    }
  }
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
