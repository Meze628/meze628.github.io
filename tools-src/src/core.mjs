import { Marked } from 'marked';

export const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function escaped(text, position) {
  let count = 0;
  for (let i = position - 1; i >= 0 && text[i] === '\\'; i--) count++;
  return count % 2 === 1;
}

// Code tokens are located in the original text, so conversion never rewrites Markdown.
export function protectedRanges(source) {
  const ranges = [];
  function walk(tokens, start, end) {
    let cursor = start;
    for (const token of tokens || []) {
      const raw = token.raw ?? token.text ?? '';
      const position = source.indexOf(raw, cursor);
      if (position < 0 || position >= end) continue;
      const finish = Math.min(position + raw.length, end);
      if (['code', 'codespan'].includes(token.type) ||
          (token.type === 'html' && /<(?:pre|code|script|style|textarea)\b/i.test(raw))) {
        ranges.push([position, finish]);
      } else {
        if (token.tokens) walk(token.tokens, position, finish);
        if (token.items) walk(token.items, position, finish);
        let cellCursor=position;
        if (token.header) for (const cell of token.header) cellCursor=walk(cell.tokens, cellCursor, finish);
        if (token.rows) for (const row of token.rows) for (const cell of row) cellCursor=walk(cell.tokens, cellCursor, finish);
      }
      cursor = finish;
    }
    return cursor;
  }
  walk(createMarkdown().lexer(source), 0, source.length);
  // Quoted/list fences contain prefixes that are absent from nested lexer raw
  // tokens. Locate their exact source ranges as well, including unclosed fences.
  let fence=null;
  for (const match of source.matchAll(/^.*(?:\n|$)/gm)) {
    const line=match[0].replace(/\r?\n$/,'').replace(/^[ \t]*(?:>[ \t]*)*(?:(?:[-+*]|\d+[.)])[ \t]+)?/,'');
    const marker=line.match(/^(`{3,}|~{3,})(.*)$/);
    if (!marker) continue;
    if(!fence&&ranges.some(([start,end])=>match.index>=start&&match.index<end))continue;
    if (!fence) fence={char:marker[1][0],length:marker[1].length,start:match.index};
    else if (marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim()) {ranges.push([fence.start,match.index+match[0].length]);fence=null;}
  }
  if (fence) ranges.push([fence.start,source.length]);
  // Protect HTML code regions even when the Markdown lexer represents them as separate tags.
  for (const match of source.matchAll(/<(pre|code|script|style|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges.sort((a,b) => a[0] - b[0]).reduce((all, range) => {
    const last = all.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else all.push(range);
    return all;
  }, []);
}

export function readMath(source, position = 0) {
  if (escaped(source, position)) return null;
  const tail = source.slice(position);
  let left, right, display;
  if (tail.startsWith('\\(')) [left,right,display] = ['\\(','\\)',false];
  else if (tail.startsWith('\\[')) [left,right,display] = ['\\[','\\]',true];
  else if (tail.startsWith('$$')) [left,right,display] = ['$$','$$',true];
  else if (tail[0] === '$' && source[position-1] !== '$' && !/\s/.test(tail[1] || ' ')) [left,right,display] = ['$','$',false];
  else return null;
  let cursor = position + left.length;
  while ((cursor = source.indexOf(right, cursor)) >= 0) {
    if (escaped(source, cursor)) { cursor += right.length; continue; }
    const body = source.slice(position + left.length, cursor);
    if (!display && /\n\s*\n/.test(body)) return null;
    if (left === '$' && (source[cursor-1] === '$' || source[cursor+1] === '$' || /\s/.test(source[cursor-1]) || /\d/.test(source[cursor+1] || ''))) {
      return null;
    }
    if (!body.trim()) return null;
    return { raw: source.slice(position, cursor + right.length), text: body.trim(), display, left, right, start: position, end: cursor + right.length };
  }
  return null;
}

export function convertDelimiters(source, direction = 'dollar', includeDisplay = true, protectCode = true) {
  const ranges = protectCode ? protectedRanges(source) : [];
  const pieces = [];
  const stats = { inline: 0, display: 0, unclosed: 0, protected: ranges.length };
  let rangeIndex = 0;
  let previousDollarEnd=-1;
  for (let position = 0; position < source.length;) {
    while (ranges[rangeIndex] && ranges[rangeIndex][1] <= position) rangeIndex++;
    const range = ranges[rangeIndex];
    if (range && position >= range[0] && position < range[1]) {
      pieces.push(source.slice(position, range[1])); position = range[1]; continue;
    }
    const math = readMath(source, position);
    if (math && (!range || math.end <= range[0])) {
      const target = direction === 'dollar' ? math.left.startsWith('\\') : math.left.startsWith('$');
      let fragment=math.raw;
      if (target && (!math.display || includeDisplay)) {
        const [left,right] = direction === 'dollar' ? (math.display ? ['$$','$$'] : ['$','$']) : (math.display ? ['\\[','\\]'] : ['\\(','\\)']);
        fragment=left + (math.display ? '\n' : '') + math.text + (math.display ? '\n' : '') + right;
        stats[math.display ? 'display' : 'inline']++;
      }
      if(!math.display&&fragment.startsWith('$')&&previousDollarEnd===position)pieces.push(' ');
      pieces.push(fragment);
      previousDollarEnd=!math.display&&fragment.startsWith('$')?math.end:-1;
      position = math.end;
    } else {
      if (!escaped(source, position) && /^(?:\\\(|\\\[)/.test(source.slice(position))) stats.unclosed++;
      pieces.push(source[position++]);
    }
  }
  return { text: pieces.join(''), stats };
}

export function createMarkdown(renderMath) {
  const parser = new Marked({ gfm: true, breaks: false });
  parser.use({
    extensions: [
      {
        name: 'mathBlock', level: 'block',
        start: source => source.search(/^(?: {0,3})(?:\$\$|\\\[)/m),
        tokenizer(source) {
          const spaces = source.match(/^ {0,3}/)[0].length;
          const math = readMath(source, spaces);
          if (!math?.display) return;
          const remainder = source.slice(math.end).match(/^[ \t]*(?:\n|$)/);
          if (!remainder) return;
          return { type:'mathBlock', raw:source.slice(0, math.end) + remainder[0], text:math.text, display:true };
        },
        renderer: token => renderMath ? renderMath(token.text, true) : '',
      },
      {
        name: 'mathInline', level: 'inline',
        start: source => source.search(/\$|\\[([]/),
        tokenizer(source) {
          const math = readMath(source);
          if (math) return { type:'mathInline', raw:math.raw, text:math.text, display:math.display };
        },
        renderer: token => renderMath ? renderMath(token.text, token.display) : '',
      },
      {
        name:'pageBreak', level:'block',
        start: source => source.search(/^ {0,3}<!--\s*pagebreak\s*-->[\t ]*$/mi),
        tokenizer(source) {
          const match = source.match(/^ {0,3}<!--\s*pagebreak\s*-->[ \t]*(?:\n|$)/i);
          if (match) return {type:'pageBreak',raw:match[0]};
        },
        renderer: () => '<div class="md-page-break" aria-label="分页符">分页符</div>',
      },
    ],
    renderer: {
      html({ text }) { return /^\s*<br\s*\/?>(?:\s*)$/i.test(text) ? '<br>' : escapeHtml(text); },
    },
  });
  return parser;
}

export const defaults = Object.freeze({
  filename: 'Markdown 文稿', font: 'sans', fontSize: 12, lineHeight: 1.65,
  paragraphGap: 7, headingScale: 1, codeFontSize: 10, paper: 'A4', orientation: 'portrait',
  marginTop: 20, marginBottom: 20, marginLeft: 20, marginRight: 20,
  pageNumbers: true, header: '', title: '',
});

export function normalizeSettings(settings = {}) {
  const result = {...defaults, ...settings};
  const limits = {fontSize:[8,28], lineHeight:[1,3], paragraphGap:[0,40], headingScale:[0.75,1.8], codeFontSize:[6,22], marginTop:[8,50], marginBottom:[8,50], marginLeft:[8,50], marginRight:[8,50]};
  for (const [key,[min,max]] of Object.entries(limits)) {
    const value = Number(result[key]);
    result[key] = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : defaults[key];
  }
  if (!['A4','A5','LETTER'].includes(result.paper)) result.paper = defaults.paper;
  if (!['portrait','landscape'].includes(result.orientation)) result.orientation = defaults.orientation;
  if (!['sans','serif','custom'].includes(result.font)) result.font = defaults.font;
  result.pageNumbers = Boolean(result.pageNumbers);
  for (const key of ['filename','title','header']) result[key] = String(result[key] ?? '').slice(0,120);
  return result;
}
