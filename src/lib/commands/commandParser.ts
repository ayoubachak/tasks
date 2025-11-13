export interface ParsedCommand {
  type: 'task' | 'note';
  title: string;
  content?: string;
  options?: Record<string, string>;
  lineNumber?: number;
}

function parseQuotedString(input: string, startIndex: number): { value: string; endIndex: number } | null {
  if (input[startIndex] !== '"') return null;
  
  let i = startIndex + 1;
  let value = '';
  let escaped = false;
  
  while (i < input.length) {
    const char = input[i];
    
    if (escaped) {
      value += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      return { value, endIndex: i + 1 };
    } else {
      value += char;
    }
    
    i++;
  }
  
  return null; // Unclosed quote
}

function parseOptions(input: string, startIndex: number): { options: Record<string, string>; endIndex: number } {
  const options: Record<string, string> = {};
  let i = startIndex;
  
  // Skip whitespace
  while (i < input.length && /\s/.test(input[i])) {
    i++;
  }
  
  while (i < input.length) {
    // Find option name (word characters and hyphens)
    let optionStart = i;
    while (i < input.length && /[\w-]/.test(input[i])) {
      i++;
    }
    
    if (i === optionStart) break; // No option name found
    
    const optionName = input.substring(optionStart, i);
    
    // Skip whitespace and colon
    while (i < input.length && (/\s/.test(input[i]) || input[i] === ':')) {
      if (input[i] === ':') {
        i++;
        break;
      }
      i++;
    }
    
    // Parse option value (quoted string or unquoted value)
    let optionValue = '';
    
    if (i < input.length && input[i] === '"') {
      const quoted = parseQuotedString(input, i);
      if (quoted) {
        optionValue = quoted.value;
        i = quoted.endIndex;
      } else {
        // Unclosed quote, take rest of line
        i++;
        while (i < input.length && input[i] !== '\n') {
          optionValue += input[i];
          i++;
        }
      }
    } else {
      // Unquoted value - take until whitespace or end of line
      while (i < input.length && !/\s/.test(input[i]) && input[i] !== '\n') {
        optionValue += input[i];
        i++;
      }
    }
    
    if (optionName && optionValue !== undefined) {
      options[optionName] = optionValue;
    }
    
    // Skip whitespace before next option
    while (i < input.length && /\s/.test(input[i]) && input[i] !== '\n') {
      i++;
    }
    
    if (i < input.length && input[i] === '\n') {
      break;
    }
  }
  
  return { options, endIndex: i };
}

export function parseCommands(input: string): ParsedCommand[] {
  const commands: ParsedCommand[] = [];
  const lines = input.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      continue;
    }
    
    let i = 0;
    
    // Skip whitespace
    while (i < line.length && /\s/.test(line[i])) {
      i++;
    }
    
    // Parse command type
    let commandType = '';
    while (i < line.length && /[a-z]/.test(line[i])) {
      commandType += line[i];
      i++;
    }
    
    if (commandType !== 'task' && commandType !== 'note') {
      // Try to parse as simple task (just a title without "task" prefix)
      if (line.trim()) {
        const titleMatch = line.match(/^"([^"]+)"|^([^\s]+)/);
        if (titleMatch) {
          const title = titleMatch[1] || titleMatch[2];
          const rest = line.substring(titleMatch[0].length).trim();
          
          const { options } = parseOptions(rest, 0);
          
          commands.push({
            type: 'task',
            title: title.replace(/^"|"$/g, ''),
            options: Object.keys(options).length > 0 ? options : undefined,
            lineNumber: lineIndex + 1,
          });
        }
      }
      continue;
    }
    
    // Skip whitespace after command type
    while (i < line.length && /\s/.test(line[i])) {
      i++;
    }
    
    // Parse title (quoted string)
    const titleResult = parseQuotedString(line, i);
    if (!titleResult) {
      continue; // Invalid command - no title
    }
    
    const title = titleResult.value;
    i = titleResult.endIndex;
    
    if (commandType === 'task') {
      // Parse options for task
      const { options } = parseOptions(line, i);
      
      commands.push({
        type: 'task',
        title,
        options: Object.keys(options).length > 0 ? options : undefined,
        lineNumber: lineIndex + 1,
      });
    } else if (commandType === 'note') {
      // Skip whitespace
      while (i < line.length && /\s/.test(line[i])) {
        i++;
      }
      
      // Parse content (quoted string)
      const contentResult = parseQuotedString(line, i);
      const content = contentResult ? contentResult.value : '';
      
      commands.push({
        type: 'note',
        title,
        content,
        lineNumber: lineIndex + 1,
      });
    }
  }
  
  return commands;
}

