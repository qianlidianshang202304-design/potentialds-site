const fs = require('fs');
const XLSX = require('xlsx');

const filePath = 'D:/达人库/1. TT/EN 达人库 8w.xlsx';

console.log('Reading small Excel file:', filePath);

try {
  // Read the file
  const workbook = XLSX.readFile(filePath);
  console.log('Workbook read successfully');
  console.log('Number of sheets:', workbook.SheetNames.length);
  console.log('Sheet names:', workbook.SheetNames);
  
  if (workbook.SheetNames.length > 0) {
    const sheetName = workbook.SheetNames[0];
    console.log('Processing sheet:', sheetName);
    
    // Try to read as JSON
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log('JSON data rows:', jsonData.length);
    
    if (jsonData.length > 0) {
      console.log('First row keys:', Object.keys(jsonData[0]));
      console.log('First row data:', jsonData[0]);
    }
  }
  
} catch (e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack);
}
