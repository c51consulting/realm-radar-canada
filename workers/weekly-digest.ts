/**
 * Friday 8am US Central — builds the weekly REALM Radar email.
 * Groups approved/published listings from last 7 days by state + category,
 * has the AI draft an intro, and writes a digest record. Sending the email
 * is handled by app/api/cron/weekly-digest (Vercel cron) which calls Resend.
 */
import { supabaseAdmin } from '../lib/supabase';
import OpenAI from 'openai';
import { startRun, finishRun } from './_shared';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const runId = await startRun('weekly-digest');
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const { data: items, error } = await sb
    .from('listings')
    .select('id, clean_title, raw_title, state, category, source_name, source_url, realm_take, priority_score, sale_date')
    .in('status', ['published', 'human_approved'])
    .gte('updated_at', since)
    .order('priority_score', { ascending: false })
    .limit(50);
  if (error) {
    await finishRun(runId, 'error', 0, [error.message]);
    return;
  }

  const top = (items || []).slice(0, 5);
  const grouped: Record<string, typeof items> = {};
  for (const i of items || []) {
    const k = `${i.state || 'US'}/${i.category || 'general'}`;
    (grouped[k] = grouped[k] || []).push(i);
  }

  const prompt = `You are drafting the intro for REALM Radar Weekly USA.
Top items this week (priority desc):
${top.map((t, i) => `${i+1}. ${t.clean_title || t.raw_title} — ${t.state}/${t.category} — ${t.realm_take || ''}`).join('\n')}

Write a 2-3 sentence editorial intro that names notable market themes. Plain English. No hype.`;

  const intro = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
  });

  const introText = intro.choices[0].message.content || '';

  await finishRun(runId, 'success', (items || []).length, [], {
    intro: introText,
    top_ids: top.map(t => t.id),
    grouped_count: Object.keys(grouped).length,
  });
  console.log('Weekly digest assembled:', introText);
}

run().catch(async (e) => { console.error(e); process.exit(1); });
