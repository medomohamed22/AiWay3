import { allowMethods, cleanText, db, json, requireUser, safeUrl } from './_lib.js';

const categories = new Set(['Stores','Games','Business','Tools','Finance','Social']);

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  try {
    const user = await requireUser(req);
    const name = cleanText(req.body?.name, 80);
    const category = cleanText(req.body?.category, 30);
    const shortDescription = cleanText(req.body?.shortDescription, 500);
    const developerName = cleanText(req.body?.developerName, 100);
    const contactEmail = cleanText(req.body?.contactEmail, 160).toLowerCase();
    const websiteUrl = safeUrl(req.body?.websiteUrl);
    const iconUrl = req.body?.iconUrl ? safeUrl(req.body.iconUrl) : null;
    const screenshotUrls = Array.isArray(req.body?.screenshotUrls)
      ? req.body.screenshotUrls.slice(0, 6).map(safeUrl)
      : [];

    if (!name || !shortDescription || !developerName || !contactEmail || !categories.has(category)) {
      return json(res, 400, { error: 'Please complete all required fields' });
    }

    const supabase = db();
    const { data, error } = await supabase
      .from('apps')
      .insert({
        owner_id: user.id,
        name,
        category,
        short_description: shortDescription,
        website_url: websiteUrl,
        icon_url: iconUrl,
        screenshot_urls: screenshotUrls,
        developer_name: developerName,
        contact_email: contactEmail,
        status: 'pending'
      })
      .select('id,name,status,created_at')
      .single();
    if (error) throw error;
    return json(res, 201, { app: data });
  } catch (error) {
    console.error(error);
    if (error.message === 'UNAUTHORIZED') return json(res, 401, { error: 'Sign in with Pi first' });
    if (error.message === 'INVALID_URL') return json(res, 400, { error: 'Invalid URL' });
    return json(res, 500, { error: 'Unable to submit app' });
  }
}
