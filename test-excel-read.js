const fs = require('fs');
const path = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';

console.log('Checking file existence...');
if (fs.existsSync(path)) {
  console.log('File exists');
  const stats = fs.statSync(path);
  console.log('File size:', (stats.size / (1024 * 1024)).toFixed(2), 'MB');
  
  // Try to read the file with different libraries
  try {
    console.log('\nTrying with xlsx...');
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(path, { cellDates: true, type: 'binary' });
    console.log('Workbook read successfully');
    console.log('Sheet names:', workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
      console.log('\nProcessing sheet:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      
      // Try to convert to JSON with different options
      try {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Rows found:', jsonData.length);
        if (jsonData.length > 0) {
          console.log('First row (headers):', jsonData[0]);
          if (jsonData.length > 1) {
            console.log('Second row (data):', jsonData[1]);
          }
        }
      } catch (e) {
        console.log('Error converting to JSON:', e.message);
      }
    }
  } catch (e) {
    console.log('Error with xlsx:', e.message);
  }
  
  // Try a different approach - read as buffer
  try {
    console.log('\nTrying to read as buffer...');
    const buffer = fs.readFileSync(path);
    console.log('Buffer read successfully, size:', buffer.length);
  } catch (e) {
    console.log('Error reading buffer:', e.message);
  }
} else {
  console.log('File does not exist');
}
