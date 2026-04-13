/**
 * Adds furigana (reading aids) to Japanese text with kanji
 * Converts text like "私は学生です" to proper ruby HTML
 */
export function addFurigana(text: string): string {
  if (!text) return '';
  
  // Simple regex to identify kanji and wrap with ruby tags
  // In production, you'd use a proper library like kuroshiro or wanakana
  const kanjiRegex = /[\u4e00-\u9faf]+/g;
  
  return text.replace(kanjiRegex, (match) => {
    // For now, we'll just wrap kanji in ruby tags
    // A real implementation would look up readings from a dictionary
    return `<ruby>${match}<rt>reading</rt></ruby>`;
  });
}

/**
 * Parse SRT subtitle file content into entries
 */
export function parseSRT(content: string): Array<{ startTime: number; endTime: number; text: string }> {
  const entries: Array<{ startTime: number; endTime: number; text: string }> = [];
  const blocks = content.trim().split(/\n\n+/);
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    // Parse timestamp line (format: 00:00:00,000 --> 00:00:00,000)
    const timestampLine = lines[1];
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    
    if (!timestampMatch) continue;
    
    const startTime = parseTimestamp(timestampMatch[1]);
    const endTime = parseTimestamp(timestampMatch[2]);
    
    // Join remaining lines as text
    const text = lines.slice(2).join(' ').trim();
    
    entries.push({ startTime, endTime, text });
  }
  
  return entries;
}

/**
 * Parse VTT subtitle file content into entries
 */
export function parseVTT(content: string): Array<{ startTime: number; endTime: number; text: string }> {
  const entries: Array<{ startTime: number; endTime: number; text: string }> = [];
  
  // Remove WEBVTT header
  const contentWithoutHeader = content.replace(/^WEBVTT.*?\n\n/, '');
  const blocks = contentWithoutHeader.trim().split(/\n\n+/);
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;
    
    // First line might be an identifier, second is timestamp
    let timestampLine = lines[0];
    let textStartIndex = 1;
    
    // Check if first line is an identifier (not a timestamp)
    if (!timestampLine.includes('-->')) {
      timestampLine = lines[1];
      textStartIndex = 2;
    }
    
    const timestampMatch = timestampLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
    
    if (!timestampMatch) continue;
    
    const startTime = parseVTTTimestamp(timestampMatch[1]);
    const endTime = parseVTTTimestamp(timestampMatch[2]);
    
    const text = lines.slice(textStartIndex).join(' ').trim();
    
    entries.push({ startTime, endTime, text });
  }
  
  return entries;
}

function parseTimestamp(timestamp: string): number {
  const [time, ms] = timestamp.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return ((hours * 3600 + minutes * 60 + seconds) * 1000) + parseInt(ms, 10);
}

function parseVTTTimestamp(timestamp: string): number {
  const [time, ms] = timestamp.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return ((hours * 3600 + minutes * 60 + seconds) * 1000) + parseInt(ms, 10);
}

/**
 * Extract unique words from subtitle text
 * This is a simplified version - in production you'd use a proper Japanese tokenizer
 */
export function extractWordsFromText(text: string): string[] {
  // Remove punctuation and split by spaces/common delimiters
  const cleaned = text.replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
  
  // In production, use a library like kuromoji for proper tokenization
  return [...new Set(tokens)];
}
