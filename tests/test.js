const test = require('node:test');
const assert = require('node:assert');

// This is the exact escaping logic from our main.ts CSV export
function escapeCsv(val) {
  const str = String(val ?? '');
  return str.includes(',') || str.includes('"') || str.includes('\n') 
    ? `"${str.replace(/"/g, '""')}"` : str;
}

test('CSV Escaping - handles normal text', () => {
  assert.strictEqual(escapeCsv('Hello World'), 'Hello World');
});

test('CSV Escaping - handles commas', () => {
  assert.strictEqual(escapeCsv('Hello, World'), '"Hello, World"');
});

test('CSV Escaping - handles quotes', () => {
  assert.strictEqual(escapeCsv('Hello "World"'), '"Hello ""World"""');
});

test('CSV Escaping - handles newlines', () => {
  assert.strictEqual(escapeCsv('Hello\nWorld'), '"Hello\nWorld"');
});

test('CSV Escaping - handles null/undefined', () => {
  assert.strictEqual(escapeCsv(null), '');
  assert.strictEqual(escapeCsv(undefined), '');
});
