/** Admin queue: review + approve/reject listings. Auth via ADMIN_API_TOKEN header. */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

function adminAuthOk(req: NextRequest) {
  const t = process.env.ADMIN_API_TOKEN;
  if (!t) return false;
  return req.headers.get('x-admin-token') === t;
}

export async function GET(req: NextRequest) {
  if (!adminAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || 'ai_reviewed';
  const limit = Math.min(parseInt(sp.get('limit') || '500', 10) || 500, 1000);
  const stateF = sp.get('state');
  const categoryF = sp.get('category');
  const minPriority = parseInt(sp.get('min_priority') || '0', 10) || 0;
  const sourceF = sp.get('source');
  const sb = supabaseAdmin();
  let q = sb.from('listings').select('*').eq('status', status);
  if (stateF) q = q.eq('state', stateF);
  if (categoryF) q = q.eq('category', categoryF);
  if (minPriority > 0) q = q.gte('priority_score', minPriority);
  if (sourceF) q = q.ilike('source_name', `%${sourceF}%`);
  const { data, error } = await q.order('priority_score', { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Also return counts per status for the UI sidebar
  const { data: countsData } = await sb.from('listings').select('status');
  const counts: Record<string, number> = {};
  (countsData || []).forEach((r: any) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  return NextResponse.json({ items: data, counts, total_visible: (data || []).length });
}

export async function PATCH(req: NextRequest) {
  if (!adminAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, ids, action, notes, featured } = body || {};
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });
  const idList: string[] = Array.isArray(ids) && ids.length > 0 ? ids : (id ? [id] : []);
  if (idList.length === 0) return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  if (idList.length > 1000) return NextResponse.json({ error: 'too many ids (max 1000)' }, { status: 400 });
  const sb = supabaseAdmin();
  const update: Record<string, unknown> = {};
  if (action === 'approve' || action === 'publish') update.status = 'published';
  else if (action === 'reject') update.status = 'rejected';
  else if (action === 'feature') update.featured = !!featured;
  else if (action === 'archive') update.status = 'archived';
  else if (action === 'unpublish') update.status = 'ai_reviewed';
  else return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  if (notes) update.notes = notes;
  if (update.status === 'published') (update as any).published_at = new Date().toISOString();
  const { error, count } = await sb.from('listings').update(update, { count: 'exact' }).in('id', idList);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: count ?? idList.length });
}
