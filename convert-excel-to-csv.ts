import * as XLSX from 'xlsx';
import fs from 'fs';

async function main() {
  const excelPath = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.xlsx';
  const csvPath = 'D:\\达人库\\1. TT\\【机密】美区全量达人清单 - 0119更新 50w.csv';
  
  console.log('Converting Excel to CSV...');
  console.log('Input:', excelPath);
  console.log('Output:', csvPath);
  
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(excelPath);
    console.log('Workbook loaded successfully');
    console.log('Sheet names:', workbook.SheetNames);
    
    if (workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in Excel file');
    }
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    console.log('Processing sheet:', sheetName);
    
    // 转换为CSV
    const csvContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    console.log('CSV content generated, length:', csvContent.length);
    
    // 写入CSV文件
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log('CSV file written successfully');
    
  } catch (error) {
    console.error('Error converting Excel to CSV:', error);
    process.exit(1);
  }
}

main();