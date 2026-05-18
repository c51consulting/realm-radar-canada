// IndexNow verification key file. See https://www.indexnow.org/
export const runtime = 'edge';
export const revalidate = 86400;
export async function GET() {
  return new Response('3532ed809c00e1c1aee913731e1fb984f5bca8d9c1f2486d', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
