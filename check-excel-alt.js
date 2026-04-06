const XLSX = require('xlsx');
const path = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';

try {
  console.log('Reading Excel file with different options...');
  
  // Try different reading options
  const optionsList = [
    { cellDates: true, cellText: false },
    { cellDates: false, cellText: true },
    { cellDates: true, cellText: true },
    { raw: true },
    { raw: false }
  ];
  
  for (const options of optionsList) {
    console.log('\nTrying options:', options);
    try {
      const workbook = XLSX.readFile(path, options);
      console.log('Sheet names:', workbook.SheetNames);
      
      for (const sheetName of workbook.SheetNames) {
        console.log('Sheet:', sheetName);
        const worksheet = workbook.Sheets[sheetName];
        
        // Try to get range
        if (worksheet['!ref']) {
          console.log('Range:', worksheet['!ref']);
        }
        
        // Try to get first few cells using different methods
        try {
          // Method 1: Direct cell access
          console.log('First few cells (direct access):');
          for (let r = 0; r < 5; r++) {
            let rowData = '';
            for (let c = 0; c < 5; c++) {
              const cellAddress = XLSX.utils.encode_cell({ c, r });
              const cell = worksheet[cellAddress];
              if (cell) {
                rowData += `${cellAddress}: ${cell.v}\t`;
              }
            }
            if (rowData) {
              console.log(rowData);
            }
          }
        } catch (e) {
          console.log('Error with direct access:', e.message);
        }
        
        try {
          // Method 2: Range-based
          if (worksheet['!ref']) {
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            console.log('Range decoded:', range);
          }
        } catch (e) {
          console.log('Error with range decoding:', e.message);
        }
      }
    } catch (e) {
      console.log('Error reading with these options:', e.message);
    }
  }
  
} catch (error) {
  console.error('Overall error:', error.message);
  console.error('Stack:', error.stack);
}
