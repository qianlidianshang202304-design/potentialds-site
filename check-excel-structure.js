const XLSX = require('xlsx');
const path = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';

try {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(path);
  
  console.log('Sheet names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    console.log('\nProcessing sheet:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    
    // Try different approaches to get data
    try {
      // Approach 1: Direct JSON conversion
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      if (jsonData.length > 0) {
        console.log('Headers from JSON:', Object.keys(jsonData[0]));
        if (jsonData.length > 1) {
          console.log('Sample row:', jsonData[1]);
        }
      } else {
        console.log('No data found in JSON format');
      }
    } catch (e) {
      console.log('Error with JSON conversion:', e.message);
    }
    
    try {
      // Approach 2: Array conversion
      const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (arrayData.length > 0) {
        console.log('Headers from array:', arrayData[0]);
        if (arrayData.length > 1) {
          console.log('Sample row:', arrayData[1]);
        }
      } else {
        console.log('No data found in array format');
      }
    } catch (e) {
      console.log('Error with array conversion:', e.message);
    }
  }
} catch (error) {
  console.error('Error reading Excel file:', error.message);
  console.error('Stack:', error.stack);
}
