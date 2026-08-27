import { matchesMagicBytes } from './magic-bytes';

/** Minimal real signatures for positive tests. */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n', 'latin1'), Buffer.from('rest of document')]);
/** HTML disguised as PNG — the exact stored-XSS scenario we are defending against. */
const HTML_AS_PNG = Buffer.from('<html><script>alert(1)</script></html>');

describe('matchesMagicBytes', () => {
  it('accepts a real PNG declared as image/png', () => {
    expect(matchesMagicBytes(PNG, 'image/png')).toBe(true);
  });

  it('accepts a real JPEG declared as image/jpeg', () => {
    expect(matchesMagicBytes(JPEG, 'image/jpeg')).toBe(true);
  });

  it('accepts a real JPEG declared as image/jpg (non-IANA alias)', () => {
    expect(matchesMagicBytes(JPEG, 'image/jpg')).toBe(true);
  });

  it('accepts a PDF declared as application/pdf', () => {
    expect(matchesMagicBytes(PDF, 'application/pdf')).toBe(true);
  });

  it('rejects HTML smuggled as image/png', () => {
    expect(matchesMagicBytes(HTML_AS_PNG, 'image/png')).toBe(false);
  });

  it('rejects a PNG declared as application/pdf', () => {
    expect(matchesMagicBytes(PNG, 'application/pdf')).toBe(false);
  });

  it('rejects when buffer is empty or missing', () => {
    expect(matchesMagicBytes(Buffer.alloc(0), 'image/png')).toBe(false);
    expect(matchesMagicBytes(null, 'image/png')).toBe(false);
    expect(matchesMagicBytes(undefined, 'application/pdf')).toBe(false);
  });

  it('rejects mimetypes outside the allowlist', () => {
    expect(matchesMagicBytes(Buffer.from('MZ...'), 'application/zip')).toBe(false);
    expect(matchesMagicBytes(PNG, 'image/svg+xml')).toBe(false);
  });
});
