const https    = require('https');
const ExternalJob = require('../models/ExternalJob');

// ─── Strip HTML tags from description ─────────────────────
const stripHtml = (html = '') =>
    html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

// ─── Map job types to our enum ────────────────────
const mapJobType = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('intern')) return 'Internship';
    if (t.includes('full'))   return 'Full-Time';
    if (t.includes('part'))   return 'Part-Time';
    if (t.includes('contract') || t.includes('freelance')) return 'Contract';
    return 'Remote';
};

// ─── Get Company Logo URL with local SVG fallback mappings ───
const getCompanyLogo = (companyName) => {
    if (!companyName) return '';
    const name = companyName.toLowerCase().trim();
    
    // Explicit mappings for top corporate known brands to local SVGs
    if (name.includes('google')) return '/logos/google.svg';
    if (name.includes('amazon')) return '/logos/amazon.svg';
    if (name.includes('microsoft')) return '/logos/microsoft.svg';
    if (name.includes('swiggy')) return '/logos/swiggy.svg';
    if (name.includes('zomato')) return '/logos/zomato.svg';
    if (name.includes('razorpay')) return '/logos/razorpay.svg';
    if (name.includes('zoho')) return '/logos/zoho.svg';
    if (name === 'tcs' || name.includes('tata consultancy')) return '/logos/tcs.svg';
    if (name === 'cred' || name.startsWith('cred ')) return '/logos/cred.svg';
    if (name.includes('freshworks')) return '/logos/freshworks.svg';
    if (name === 'jio' || name.includes('jio platforms') || name.includes('reliance jio')) return '/logos/jio.svg';
    if (name.includes('phonepe')) return '/logos/phonepe.svg';
    if (name.includes('atlassian')) return '/logos/atlassian.svg';
    if (name === 'uber' || name.startsWith('uber ')) return '/logos/uber.svg';
    if (name.includes('paytm')) return '/logos/paytm.svg';
    if (name.includes('infosys')) return '/logos/infosys.svg';
    if (name.includes('wipro')) return '/logos/wipro.svg';
    if (name === 'ola' || name.includes('ola cabs') || name.includes('ola electric')) return '/logos/ola.svg';
    if (name.includes('airtel')) return '/logos/airtel.svg';
    if (name.includes('cognizant')) return '/logos/cognizant.svg';
    if (name.includes('accenture')) return '/logos/accenture.svg';
    if (name.includes('flipkart')) return '/logos/flipkart.svg';
    if (name.includes('meta') || name.includes('facebook')) return '/logos/meta.svg';
    
    // If not a recognized brand, return empty to trigger the beautiful initials-avatar fallback
    return '';
};

// ─── Filter foreign or scrambled job postings ─────────────────
const isEnglishAndLegit = (job) => {
    const title = job.position || job.title || '';
    const company = job.company || job.company_name || '';
    const location = job.location || job.candidate_required_location || '';
    
    // 1. CJK, Cyrillic, Arabic, Hebrew characters
    const nonEnglishRanges = [
        /[\u4e00-\u9fa5]|[\u3040-\u30ff]|[\uac00-\ud7af]/, // CJK
        /[\u0400-\u04FF]/, // Cyrillic
        /[\u0600-\u06FF]|[\u0750-\u077F]/, // Arabic/Persian
        /[\u0590-\u05FF]/, // Hebrew
    ];

    for (const regex of nonEnglishRanges) {
        if (regex.test(title) || regex.test(company) || regex.test(location)) {
            return false;
        }
    }
    
    // 2. Filter out scrambled mojibake pattern (e.g. 'ä¸', 'æ¯', 'è®', 'ç°', 'æ≡', 'é≡', 'è≡')
    const mojibakeRegex = /[äæéèïöüåøçñß]¸|[äæéèïöüåøçñß]…|[äæéèïöüåøçñß]ª|[äæéèïöüåøçñß]²|ä¸|æ¯|è®|ç°|æ≡|é≡|è≡/;
    if (mojibakeRegex.test(title) || mojibakeRegex.test(company) || mojibakeRegex.test(location)) {
        return false;
    }

    // 3. Dense Ø and Ù character count (Arabic mojibake signature)
    const checkArabicMojibake = (text) => {
        if (!text) return false;
        const matches = text.match(/[ØÙÚÛ]/g);
        return matches && matches.length >= 3;
    };
    if (checkArabicMojibake(title) || checkArabicMojibake(company) || checkArabicMojibake(location)) {
        return false;
    }
    
    return true;
};

// ─── Fetch JSON from a URL (native https) ─────────────────
const fetchJson = (url) =>
    new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'PlaceIQ/1.0' } }, (res) => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    // Some APIs (e.g. RemoteOK) return non-JSON when they block the request
                    const trimmed = data.trim();
                    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
                        resolve([]);
                        return;
                    }
                    resolve(JSON.parse(data));
                }
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });

// ─── Fetch live remote developer jobs from RemoteOK (completely free, no API key needed, has company logos!) ───
const fetchAndSaveRemoteOKJobs = async (searchTerm = '') => {
    let upserted = 0;
    try {
        const tagParam = searchTerm ? `?tag=${encodeURIComponent(searchTerm.toLowerCase())}` : '';
        const url = `https://remoteok.com/api${tagParam}`;
        console.log(`[JobFetcher] Fetching live RemoteOK jobs (Query: '${searchTerm || 'default'}')...`);
        const rawJobs = await fetchJson(url);
        
        // RemoteOK API returns a legal notice as the first element
        const jobs = Array.isArray(rawJobs) ? rawJobs.slice(1) : [];
        const cleanJobs = jobs.filter(isEnglishAndLegit);
        
        if (cleanJobs.length > 0) {
            // Take the first 50 fresh listings (up from 30) to increase density to 100+
            const limit = searchTerm ? 30 : 55;
            const mappedJobs = cleanJobs.slice(0, limit).map(job => ({
                id: job.id,
                title: job.position,
                company_name: job.company,
                company_logo_url: job.company_logo || '',
                job_type: 'Remote',
                candidate_required_location: job.location || 'Remote',
                salary: job.salary || '',
                description: job.description || '',
                url: job.apply_url || job.url || '',
                tags: job.tags || [],
                category: searchTerm ? 'search-result' : 'remote',
                publication_date: new Date(job.date).getTime()
            }));
            
            upserted = await upsertJobs(mappedJobs, 'remoteok', searchTerm ? 'search-result' : 'remote');
            console.log(`[JobFetcher] Successfully fetched and upserted ${mappedJobs.length} remote jobs from RemoteOK`);
        }
    } catch (err) {
        console.error('[JobFetcher] Error fetching RemoteOK jobs:', err.message);
    }
    return upserted;
};

// ─── Fetch live India tech jobs from Adzuna (generous free developer tier) ───
const fetchAndSaveAdzunaJobs = async (searchTerm = '') => {
    let upserted = 0;
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    
    if (!appId || !appKey) {
        console.log("[JobFetcher] Adzuna credentials not found in .env. Skipping Adzuna live search.");
        return 0;
    }
    
    try {
        // Fetch software developer jobs in India (in)
        const queryTerm = searchTerm ? encodeURIComponent(searchTerm) : 'software developer';
        // Request up to 70 results (up from 30) for high volumes
        const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=70&what=${queryTerm}`;
        console.log(`[JobFetcher] Fetching live India tech jobs from Adzuna API (Query: '${searchTerm || 'default'}')...`);
        const data = await fetchJson(url);
        const results = data.results || [];
        const cleanResults = results.filter(job => isEnglishAndLegit({
            title: job.title,
            company: job.company?.display_name
        }));
        
        if (cleanResults.length > 0) {
            const mappedJobs = cleanResults.map(job => ({
                id: job.id,
                title: job.title,
                company_name: job.company?.display_name || '',
                company_logo_url: '', // Adzuna doesn't provide logo URLs
                job_type: mapJobType(job.contract_type || job.title),
                candidate_required_location: job.location?.display_name || 'India',
                salary: job.salary_min ? `${job.salary_min} - ${job.salary_max || ''}` : '',
                description: job.description || '',
                url: job.redirect_url || '',
                tags: [job.category?.tag || 'Tech', 'India', searchTerm].filter(Boolean),
                category: searchTerm ? 'search-result' : 'india',
                publication_date: new Date(job.created).getTime()
            }));
            
            upserted = await upsertJobs(mappedJobs, 'adzuna', searchTerm ? 'search-result' : 'india');
            console.log(`[JobFetcher] Successfully fetched and upserted ${results.length} jobs from Adzuna India`);
        }
    } catch (err) {
        console.error('[JobFetcher] Error fetching Adzuna jobs:', err.message);
    }
    return upserted;
};

// ─── Concurrent Live Search & Sync ───
const searchAndFetchLiveJobs = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 3) return;
    const query = searchTerm.trim();
    console.log(`[JobFetcher] 🔍 Triggering dynamic live-API search for student query: '${query}'`);
    
    // Execute both fetches concurrently for extreme response speed
    await Promise.allSettled([
        fetchAndSaveRemoteOKJobs(query),
        fetchAndSaveAdzunaJobs(query)
    ]);
};

const fetchAndSaveRemotiveJobs = async () => {
    let totalFetched = 0;
    let totalUpserted = 0;

    // 1. Fetch RemoteOK (Completely free, no key, live developer jobs with logos!)
    const remoteOKUpserted = await fetchAndSaveRemoteOKJobs();
    totalUpserted += remoteOKUpserted;
    totalFetched += 55;

    // 2. Fetch Adzuna (If key configured, gets live India jobs)
    const adzunaUpserted = await fetchAndSaveAdzunaJobs();
    totalUpserted += adzunaUpserted;
    if (adzunaUpserted > 0) totalFetched += 70;

    console.log(`[JobFetcher] ✅ Live API refresh completed. Total processed/upserted: ${totalUpserted}`);
    return { totalFetched, totalUpserted };
};

// Helper function to handle MongoDB Upserts
const upsertJobs = async (jobs, source, categoryTag) => {
    const bulkOps = jobs.map((job) => {
        let logo = job.company_logo_url || job.company_logo || getCompanyLogo(job.company_name) || '';
        if (logo.includes('clearbit.com')) {
            logo = getCompanyLogo(job.company_name);
        }
        return {
            updateOne: {
                filter: { externalId: job.id.toString(), source: source },
                update: {
                    $set: {
                        externalId:  job.id.toString(),
                        source:      source,
                        title:       job.title || '',
                        companyName: job.company_name || '',
                        companyLogo: logo,
                        jobType:     mapJobType(job.job_type || job.title),
                        location:    job.candidate_required_location || 'Remote',
                        salary:      job.salary || '',
                        description: stripHtml(job.description),
                        applyUrl:    job.url || '',
                        tags:        Array.isArray(job.tags) ? job.tags.slice(0, 10) : [],
                        category:    categoryTag,
                        publishedAt: new Date(job.publication_date || Date.now()),
                        isActive:    true,
                        fetchedAt:   new Date(),
                    },
                },
                upsert: true,
            },
        };
    });

    const result = await ExternalJob.bulkWrite(bulkOps, { ordered: false });
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
};

module.exports = { fetchAndSaveRemotiveJobs, searchAndFetchLiveJobs, getCompanyLogo };
