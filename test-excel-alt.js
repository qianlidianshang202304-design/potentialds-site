const fs = require('fs');
const path = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';

console.log('Checking file existence...');
if (fs.existsSync(path)) {
  console.log('File exists');
  const stats = fs.statSync(path);
  console.log('File size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
  
  try {
    console.log('\nTrying with xlsx - different options...');
    const XLSX = require('xlsx');
    
    // Try different reading options
    const optionsList = [
      { cellDates: true, raw: false },
      { cellDates: false, raw: true },
      { cellDates: true, raw: true },
      { cellDates: false, raw: false },
      { cellDates: true, range: 'A1:Z100' },
    ];
    
    for (const options of optionsList) {
      console.log('\nTrying options:', options);
      try {
        const workbook = XLSX.readFile(path, options);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Try different JSON conversion options
        const jsonOptionsList = [
          { header: 1 },
          { header: 'A' },
          { header: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
          { header: 1, range: 'A1:Z10' },
        ];
        
        for (const jsonOptions of jsonOptionsList) {
          try {
            const jsonData = XLSX.utils.sheet_to_json(worksheet, jsonOptions);
            console.log('  Rows found with', jsonOptions, ':', jsonData.length);
            if (jsonData.length > 0) {
              console.log('  First row:', jsonData[0]);
              if (jsonData.length > 1) {
                console.log('  Second row:', jsonData[1]);
              }
              break;
            }
          } catch (e) {
            console.log('  Error with JSON conversion:', e.message);
          }
        }
      } catch (e) {
        console.log('  Error reading workbook:', e.message);
      }
    }
    
    // Try to get range information
    console.log('\nTrying to get range information...');
    const workbook = XLSX.readFile(path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (worksheet['!ref']) {
      console.log('Range:', worksheet['!ref']);
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      console.log('Decoded range:', range);
      console.log('Number of rows:', range.e.r - range.s.r + 1);
      console.log('Number of columns:', range.e.c - range.s.c + 1);
    }
    
    // Try to read specific cells
    console.log('\nTrying to read specific cells...');
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 5; c++) {
        const cellAddress = XLSX.utils.encode_cell({ c, r });
        const cell = worksheet[cellAddress];
        if (cell) {
          console.log(`${cellAddress}: ${cell.v}`);
        }
      }
    }
    
  } catch (e) {
    console.log('Error with xlsx:', e.message);
    console.log('Stack:', e.stack);
  }
} else {
  console.log('File does not exist');
}
