const fs = require('fs');
const XLSX = require('xlsx');

const excelPath = 'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.xlsx';
const csvPath = 'D:/达人库/1. TT/【机密】美区全量达人清单 - 0119更新 50w.csv';

console.log('Converting Excel to CSV...');
try {
  // Read the Excel file
  const workbook = XLSX.readFile(excelPath);
  console.log('Workbook read successfully');
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  console.log('Processing sheet:', sheetName);
  
  // Convert to CSV
  const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  console.log('CSV content length:', csvContent.length);
  
  // Write to CSV file
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log('CSV file written successfully:', csvPath);
  
  // Read the first few lines to verify
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const lines = csvData.split('\n');
  console.log('First 5 lines of CSV:');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    console.log(`Line ${i + 1}:`, lines[i]);
  }
  
} catch (e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack);
}
