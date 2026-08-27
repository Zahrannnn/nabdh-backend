/**
 * Magic-byte (content signature) checks for the upload allowlist.
 *
 * The multipart `Content-Type` header is client-asserted and trivially
 * spoofable, so we verify the actual bytes before an upload is accepted.
 * Zero-dependency on purpose: three formats, three signatures.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Per-mimetype signature predicates.
 * `image/jpg` is not a real IANA type but browsers/clients send it — treat it as JPEG.
 */
const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  'application/pdf': (buf) =>
    // Header should be at offset 0; the spec tolerates junk before it within
    // the first 1024 bytes, so scan that window rather than demanding offset 0.
    buf.subarray(0, 1024).includes(Buffer.from('%PDF-', 'latin1')),
  'image/jpeg': (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/jpg': (buf) => buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  'image/png': (buf) => buf.subarray(0, 8).equals(PNG_SIGNATURE),
};

/** True when the buffer's leading bytes match the declared mimetype. */
export function matchesMagicBytes(buffer: Buffer | undefined | null, mimetype: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const check = SIGNATURES[mimetype];

  return check ? check(buffer) : false;
}
