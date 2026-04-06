import * as XLSX from 'xlsx';
import fs from 'fs';

async function main() {
  const excelPath = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';
  
  console.log('Reading Excel file:', excelPath);
  
  try {
    // Method 1: Read as binary
    const data = fs.readFileSync(excelPath);
    console.log('File size:', data.length, 'bytes');
    
    const workbook = XLSX.read(data, { type: 'buffer' });
    console.log('Workbook read successfully');
    console.log('Sheet names:', workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
      console.log('\nProcessing sheet:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      
      // Try different JSON conversion options
      console.log('\n--- Method 1: Default ---');
      const rows1 = XLSX.utils.sheet_to_json(worksheet);
      console.log('Rows:', rows1.length);
      
      console.log('\n--- Method 2: Raw ---');
      const rows2 = XLSX.utils.sheet_to_json(worksheet, { raw: true });
      console.log('Rows:', rows2.length);
      
      console.log('\n--- Method 3: Header 1 ---');
      const rows3 = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('Rows:', rows3.length);
      if (rows3.length > 0) {
        console.log('First 3 rows:', rows3.slice(0, 3));
      }
      
      console.log('\n--- Method 4: No header ---');
      const rows4 = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
      console.log('Rows:', rows4.length);
      if (rows4.length > 0) {
        console.log('First row:', rows4[0]);
      }
    }
  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

main();