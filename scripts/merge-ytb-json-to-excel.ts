import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

interface YTBInfluencer {
  platform?: string;
  avatar?: string;
  totalStar?: number;
  nickname?: string;
  username?: string;
  link?: string;
  tagList?: string[];
  region?: string;
  regionZh?: string;
  regionCover?: string;
  fansNum?: number;
  viewAvg?: number;
  interactiveRateAvg?: number;
  likeAvg?: number;
  bizCount?: number;
}

interface YTBApiResponse {
  data?: {
    bloggerList?: YTBInfluencer[];
    count?: number;
    hasNextPage?: boolean;
  };
  success?: boolean;
}

function parseJsonFile(filePath: string): YTBInfluencer[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data: YTBApiResponse = JSON.parse(content);
    
    if (data.success && data.data && Array.isArray(data.data.bloggerList)) {
      return data.data.bloggerList;
    }
    return [];
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return [];
  }
}

function main() {
  const backupDir = 'D:\\达人库\\3. YTB\\WOTO_每次拦截备份';
  const outputPath = 'D:\\达人库\\3. YTB\\WOTO达人api 5w+ (23W)-整理.xlsx';
  
  // 获取所有JSON文件
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(backupDir, f));
  
  console.log(`Found ${files.length} JSON files`);
  
  // 合并所有数据
  const allInfluencers: YTBInfluencer[] = [];
  const seenUsernames = new Set<string>();
  
  for (const file of files) {
    const influencers = parseJsonFile(file);
    console.log(`Processing ${path.basename(file)}: ${influencers.length} records`);
    
    for (const influencer of influencers) {
      // 去重：根据username
      if (influencer.username && !seenUsernames.has(influencer.username)) {
        seenUsernames.add(influencer.username);
        allInfluencers.push(influencer);
      }
    }
  }
  
  console.log(`Total unique influencers: ${allInfluencers.length}`);
  
  // 转换为Excel格式
  const excelData = allInfluencers.map(item => ({
    'Platform': item.platform || '',
    'Avatar': item.avatar || '',
    'Total Star': item.totalStar || 0,
    'Nickname': item.nickname || '',
    'Username': item.username || '',
    'Link': item.link || '',
    'Tags': item.tagList ? item.tagList.join(', ') : '',
    'Region': item.region || '',
    'Region (ZH)': item.regionZh || '',
    'Region Cover': item.regionCover || '',
    'Fans Num': item.fansNum || 0,
    'View Avg': item.viewAvg || 0,
    'Interactive Rate Avg': item.interactiveRateAvg || 0,
    'Like Avg': item.likeAvg || 0,
    'Biz Count': item.bizCount || 0,
  }));
  
  // 创建Excel工作簿
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'YouTube Influencers');
  
  // 保存Excel文件
  XLSX.writeFile(wb, outputPath);
  
  console.log(`Excel file saved to: ${outputPath}`);
  console.log(`Total records: ${excelData.length}`);
}

main();
