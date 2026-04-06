const fs = require('fs');
const XLSX = require('xlsx');

// Try with different file paths
const filePath = 'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.xlsx';

console.log('Reading Excel file:', filePath);

try {
  // Read the file
  const workbook = XLSX.readFile(filePath);
  console.log('Workbook read successfully');
  console.log('Number of sheets:', workbook.SheetNames.length);
  console.log('Sheet names:', workbook.SheetNames);
  
  // Try to access sheets differently
  for (let i = 0; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    console.log('\nProcessing sheet', i, ':', sheetName);
    
    // Try different ways to get the worksheet
    const worksheet1 = workbook.Sheets[sheetName];
    console.log('Worksheet via Sheets[sheetName]:', worksheet1 ? 'OK' : 'undefined');
    
    const worksheet2 = workbook.Sheets[workbook.SheetNames[i]];
    console.log('Worksheet via Sheets[SheetNames[i]]:', worksheet2 ? 'OK' : 'undefined');
    
    // Try to read the sheet as JSON directly
    try {
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log('JSON data rows:', jsonData.length);
      if (jsonData.length > 0) {
        console.log('First row keys:', Object.keys(jsonData[0]));
      }
    } catch (e) {
      console.log('Error converting to JSON:', e.message);
    }
    
    // Try to get range
    try {
      const range = XLSX.utils.decode_range(workbook.Sheets[sheetName]['!ref']);
      console.log('Range:', range);
    } catch (e) {
      console.log('Error getting range:', e.message);
    }
  }
  
  // Try to read the entire workbook as JSON
  try {
    const allSheetsData = {};
    workbook.SheetNames.forEach(sheetName => {
      allSheetsData[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    });
    console.log('\nAll sheets data:');
    Object.keys(allSheetsData).forEach(sheetName => {
      console.log(`${sheetName}: ${allSheetsData[sheetName].length} rows`);
    });
  } catch (e) {
    console.log('Error reading all sheets:', e.message);
  }
  
} catch (e) {
  console.log('Error reading file:', e.message);
  console.log('Stack:', e.stack);
}
