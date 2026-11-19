-- Nirvanam Studio: views behind the Looker Studio dashboard
-- Built on nirvanam_reporting.events_hit_level (see events_hit_level.sql).
-- Funnel stages:
--   1 Visitor        any session
--   2 Engaged        10s+ engaged, or scrolled 50%+, or clicked a call to action
--   3 Interested     clicked a call to action, or viewed the shop
--   4 Cold lead      submitted an email address (email_captured) - known, but no stated interest yet
--   5 Warm lead      cold lead who also told us what they want (segment_selected) or enquired about a
--                    specific piece (generate_lead), or whose lead score is 60+

-- 1. One row per session.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_sessions`
OPTIONS (description = 'One row per GA4 session with funnel stage, landing and exit pages') AS
WITH hits AS (
  SELECT *,
    REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)') AS page_path
  FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
  WHERE ga_session_id IS NOT NULL
),
pv AS (
  SELECT session_key,
    ARRAY_AGG(IF(page_path IN ('', '/'), '/index.html', page_path) ORDER BY event_time ASC LIMIT 1)[OFFSET(0)]  AS landing_page,
    ARRAY_AGG(IF(page_path IN ('', '/'), '/index.html', page_path) ORDER BY event_time DESC LIMIT 1)[OFFSET(0)] AS exit_page,
    COUNT(*) AS page_views,
    COUNTIF(page_path LIKE '%shop%') AS shop_views
  FROM hits WHERE event_name = 'page_view' GROUP BY session_key
)
SELECT
  h.session_key,
  ANY_VALUE(h.ga_client_id)                         AS ga_client_id,
  MIN(h.event_date)                                 AS session_date,
  MIN(h.event_time)                                 AS session_start,
  TIMESTAMP_DIFF(MAX(h.event_time), MIN(h.event_time), SECOND) AS session_seconds,
  MAX(h.session_number)                             AS session_number,
  IF(MAX(h.session_number) > 1, 'Returning', 'New') AS visitor_type,
  ANY_VALUE(pv.landing_page)                        AS landing_page,
  ANY_VALUE(pv.exit_page)                           AS exit_page,
  IFNULL(ANY_VALUE(pv.page_views), 0)               AS page_views,
  IFNULL(ANY_VALUE(pv.shop_views), 0)               AS shop_views,
  SUM(IFNULL(h.engagement_time_msec, 0)) / 1000     AS engaged_seconds,
  MAX(CASE WHEN h.event_name LIKE 'scroll_%' THEN SAFE_CAST(REGEXP_EXTRACT(h.event_name, r'(\d+)') AS INT64)
           WHEN h.event_name = 'scroll' THEN 90 ELSE 0 END) AS max_scroll_pct,
  COUNTIF(h.event_name = 'cta_click')               AS cta_clicks,
  COUNTIF(h.event_name = 'cta_click' AND h.cta_outbound = 'true') AS outbound_clicks,
  COUNTIF(h.event_name = 'email_captured')          AS email_signups,
  COUNTIF(h.event_name = 'segment_selected')        AS interest_answers,
  COUNTIF(h.event_name = 'generate_lead')           AS piece_enquiries,
  IFNULL(NULLIF(ANY_VALUE(h.utm_source), ''), IFNULL(ANY_VALUE(h.first_user_source), '(direct)')) AS source,
  IFNULL(NULLIF(ANY_VALUE(h.utm_medium), ''), IFNULL(ANY_VALUE(h.first_user_medium), '(none)'))   AS medium,
  IFNULL(ANY_VALUE(h.utm_campaign), '(not set)')   AS campaign,
  ANY_VALUE(h.device_category)                      AS device,
  ANY_VALUE(h.operating_system)                     AS operating_system,
  ANY_VALUE(h.browser)                              AS browser,
  ANY_VALUE(h.language)                             AS language,
  ANY_VALUE(h.country)                              AS country,
  ANY_VALUE(h.region)                               AS region,
  ANY_VALUE(h.city)                                 AS city,
  ANY_VALUE(h.headline_variant)                     AS headline_variant
FROM hits h
LEFT JOIN pv USING (session_key)
GROUP BY h.session_key;

-- 2. Session funnel stage, ready for a funnel / bar chart.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_funnel`
OPTIONS (description = 'Sessions reaching each funnel stage, by day') AS
WITH s AS (
  SELECT *,
    (engaged_seconds >= 10 OR max_scroll_pct >= 50 OR cta_clicks > 0)  AS is_engaged,
    (cta_clicks > 0 OR shop_views > 0)                                AS is_interested,
    (email_signups > 0 OR piece_enquiries > 0)                         AS is_cold_lead,
    (piece_enquiries > 0 OR (email_signups > 0 AND interest_answers > 0)) AS is_warm_lead
  FROM `nirvanam-analytics.nirvanam_reporting.dash_sessions`
)
SELECT session_date, source, medium, device, country, stage_order, stage, COUNTIF(reached) AS sessions
FROM s, UNNEST([
  STRUCT(1 AS stage_order, '1 Visitor' AS stage, TRUE AS reached),
  STRUCT(2, '2 Engaged', is_engaged),
  STRUCT(3, '3 Interested (CTA or shop)', is_interested),
  STRUCT(4, '4 Cold lead (gave email)', is_cold_lead),
  STRUCT(5, '5 Warm lead (stated interest)', is_warm_lead)
])
GROUP BY session_date, source, medium, device, country, stage_order, stage;

-- 3. Lead score per browser (anonymous Google ID), with tier.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_lead_scores`
OPTIONS (description = 'Lead score per ga_client_id: behaviour points plus lead actions') AS
WITH u AS (
  SELECT ga_client_id,
    MIN(session_start) AS first_seen,
    MAX(session_start) AS last_seen,
    COUNT(*)           AS sessions,
    SUM(page_views)    AS page_views,
    SUM(shop_views)    AS shop_views,
    SUM(engaged_seconds) AS engaged_seconds,
    MAX(max_scroll_pct)  AS max_scroll_pct,
    SUM(cta_clicks)      AS cta_clicks,
    SUM(outbound_clicks) AS social_clicks,
    SUM(email_signups)   AS email_signups,
    SUM(interest_answers) AS interest_answers,
    SUM(piece_enquiries)  AS piece_enquiries,
    ANY_VALUE(source) AS source, ANY_VALUE(medium) AS medium,
    ANY_VALUE(country) AS country, ANY_VALUE(city) AS city, ANY_VALUE(device) AS device
  FROM `nirvanam-analytics.nirvanam_reporting.dash_sessions`
  GROUP BY ga_client_id
), scored AS (
  SELECT *,
    LEAST(page_views, 10)                     -- 1 per page, up to 10
    + LEAST(shop_views, 3) * 3                -- shop browsing, up to 9
    + LEAST(sessions - 1, 3) * 5              -- each return visit, up to 15
    + IF(max_scroll_pct >= 75, 5, 0)          -- read the story
    + LEAST(CAST(engaged_seconds / 30 AS INT64), 5)  -- 1 per 30s engaged, up to 5
    + LEAST(cta_clicks, 5) * 2                -- calls to action, up to 10
    + LEAST(social_clicks, 2) * 3             -- followed us on social, up to 6
    + IF(email_signups > 0, 25, 0)            -- gave email: cold lead
    + IF(interest_answers > 0, 15, 0)         -- told us what they want
    + IF(piece_enquiries > 0, 30, 0)          -- enquired about a piece
    AS lead_score
  FROM u
)
SELECT *,
  CASE
    WHEN email_signups + piece_enquiries = 0 AND lead_score >= 20 THEN '2 Engaged prospect'
    WHEN email_signups + piece_enquiries = 0 THEN '1 Anonymous visitor'
    WHEN piece_enquiries > 0 OR interest_answers > 0 OR lead_score >= 60 THEN '4 Warm lead'
    ELSE '3 Cold lead'
  END AS lead_tier
FROM scored;

-- 4. Call-to-action performance.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_cta`
OPTIONS (description = 'CTA clicks by label, location and page') AS
SELECT
  event_date,
  IFNULL(cta_text, '(no label)')     AS cta_text,
  IFNULL(cta_type, '(unknown)')      AS cta_type,
  IFNULL(cta_location, '(unknown)')  AS cta_location,
  IFNULL(REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)'), '(unknown)') AS page_path,
  IFNULL(cta_url, '')                AS cta_destination,
  cta_outbound = 'true'              AS is_outbound,
  device_category                    AS device,
  country,
  COUNT(*)                           AS clicks,
  COUNT(DISTINCT ga_client_id)       AS users
FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
WHERE event_name = 'cta_click'
GROUP BY 1,2,3,4,5,6,7,8,9;

-- 5. Drop-out points: where sessions end, and how deep people read each page.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_page_dropoff`
OPTIONS (description = 'Per page: views, exits, bounces and scroll reach') AS
WITH pv AS (
  SELECT session_key, event_date,
    IF(REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)') IN ('', '/'), '/index.html',
       REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)')) AS page_path
  FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
  WHERE event_name = 'page_view'
), sc AS (
  SELECT session_key,
    IF(REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)') IN ('', '/'), '/index.html',
       REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)')) AS page_path,
    MAX(SAFE_CAST(REGEXP_EXTRACT(event_name, r'(\d+)') AS INT64)) AS max_scroll
  FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
  WHERE event_name LIKE 'scroll_%'
  GROUP BY 1, 2
), s AS (
  SELECT session_key, exit_page, page_views, cta_clicks, email_signups, piece_enquiries, engaged_seconds
  FROM `nirvanam-analytics.nirvanam_reporting.dash_sessions`
)
SELECT
  pv.event_date,
  pv.page_path,
  COUNT(*)                                               AS page_views,
  COUNT(DISTINCT pv.session_key)                         AS sessions,
  COUNT(DISTINCT IF(s.exit_page = pv.page_path, pv.session_key, NULL)) AS exits,
  COUNT(DISTINCT IF(s.page_views = 1 AND s.cta_clicks = 0 AND s.engaged_seconds < 10, pv.session_key, NULL)) AS bounces,
  COUNT(DISTINCT IF(s.exit_page = pv.page_path AND s.email_signups + s.piece_enquiries = 0, pv.session_key, NULL)) AS exits_without_lead,
  COUNT(DISTINCT IF(IFNULL(sc.max_scroll, 0) >= 25, pv.session_key, NULL)) AS reached_25,
  COUNT(DISTINCT IF(IFNULL(sc.max_scroll, 0) >= 50, pv.session_key, NULL)) AS reached_50,
  COUNT(DISTINCT IF(IFNULL(sc.max_scroll, 0) >= 75, pv.session_key, NULL)) AS reached_75,
  COUNT(DISTINCT IF(IFNULL(sc.max_scroll, 0) >= 90, pv.session_key, NULL)) AS reached_90
FROM pv
JOIN s USING (session_key)
LEFT JOIN sc ON sc.session_key = pv.session_key AND sc.page_path = pv.page_path
GROUP BY 1, 2;

-- 6. Page-to-page paths (user flow).
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_page_flow`
OPTIONS (description = 'Page to next page transitions, including exits and lead actions') AS
WITH steps AS (
  SELECT session_key, event_date, event_time,
    CASE event_name
      WHEN 'page_view' THEN IF(REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)') IN ('', '/'), '/index.html',
                                REGEXP_EXTRACT(page_location, r'^https?://[^/]+(/[^?#]*)'))
      WHEN 'email_captured' THEN '[Gave email]'
      WHEN 'segment_selected' THEN '[Stated interest]'
      WHEN 'generate_lead' THEN '[Enquired about a piece]'
    END AS step
  FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
  WHERE event_name IN ('page_view', 'email_captured', 'segment_selected', 'generate_lead')
), ordered AS (
  SELECT *, LEAD(step) OVER (PARTITION BY session_key ORDER BY event_time) AS next_step,
            ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY event_time) AS step_number
  FROM steps
)
SELECT event_date, step_number, step AS from_step, IFNULL(next_step, '[Left the site]') AS to_step,
       COUNT(*) AS transitions
FROM ordered
GROUP BY 1, 2, 3, 4;

-- 7. Daily overview and data-health check.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_daily`
OPTIONS (description = 'Daily KPIs') AS
SELECT
  session_date,
  COUNT(*)                                   AS sessions,
  COUNT(DISTINCT ga_client_id)               AS users,
  COUNTIF(visitor_type = 'New')              AS new_sessions,
  SUM(page_views)                            AS page_views,
  COUNTIF(page_views <= 1 AND cta_clicks = 0 AND engaged_seconds < 10) AS bounced_sessions,
  SUM(cta_clicks)                            AS cta_clicks,
  COUNTIF(email_signups > 0)                 AS cold_leads,
  COUNTIF(piece_enquiries > 0 OR (email_signups > 0 AND interest_answers > 0)) AS warm_leads,
  AVG(engaged_seconds)                       AS avg_engaged_seconds
FROM `nirvanam-analytics.nirvanam_reporting.dash_sessions`
GROUP BY session_date;

-- 8. Security findings (maintained by hand; update status as issues are closed).
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.dash_security_findings` AS
SELECT * FROM UNNEST([
  STRUCT(DATE '2026-11-19' AS found_on, 'High' AS severity, 'Signup endpoint (Apps Script)' AS area,
    'Email field written to the Google Sheet without formula escaping: an address starting with = could run a Sheets formula (e.g. IMPORTXML) and leak the list' AS issue,
    'Strict email validation and formula escaping on every field (Apps Script v3)' AS fix, 'Fixed' AS status),
  STRUCT(DATE '2026-11-19', 'Medium', 'Signup endpoint (Apps Script)',
    'No rate limit: a bot could flood the sheet and use up the first-hundred places',
    'Site-wide limit of 30 new signups per 10 minutes, plus existing hidden honeypot field', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Medium', 'Signup endpoint (Apps Script)',
    'Anyone could overwrite another person\'s interest answer by re-submitting their email, and the reply revealed whether an email was already on the list',
    'Interest answers only accepted for IDs issued in the last 30 minutes and from a fixed list; duplicate signups get the same reply as new ones', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Medium', 'Website headers',
    'No Content Security Policy, so any injected script would run (inline scripts allowed everywhere)',
    'CSP added to every page; all page scripts moved to files so inline scripts are blocked', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Low', 'Website headers',
    'No X-Frame-Options / frame-ancestors (GitHub Pages cannot send headers): page could be framed for clickjacking',
    'Script refuses to run inside another site\'s frame', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Low', 'Website headers',
    'No Referrer-Policy: full page URLs (with campaign tags) sent to other sites',
    'strict-origin-when-cross-origin referrer policy on every page', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Low', 'Disclosure',
    'No way for researchers to report a security problem',
    '/.well-known/security.txt published', 'Fixed'),
  STRUCT(DATE '2026-11-19', 'Medium', 'Hosting (GitHub)',
    'main branch is unprotected: anyone who gets into the GitHub account can change the live site directly',
    'Turn on two-factor authentication for the GitHub account and add branch protection', 'Action needed (owner)'),
  STRUCT(DATE '2026-11-19', 'Low', 'Hosting (GitHub Pages)',
    'No HSTS header on the custom domain (GitHub Pages does not send one)',
    'Confirm "Enforce HTTPS" is ticked in repo Settings > Pages; consider Cloudflare in front for HSTS and full security headers', 'Action needed (owner)'),
  STRUCT(DATE '2026-11-19', 'Medium', 'Google Tag Manager',
    'Anyone with Publish rights in GTM can run any script on the site',
    'Keep GTM users to the owner only, with 2-step verification on the Google account; review the container before each publish', 'Action needed (owner)'),
  STRUCT(DATE '2026-11-19', 'Low', 'Shop enquiry form',
    'Shop form endpoint is still a placeholder, so enquiries are not saved (not a vulnerability, a broken flow)',
    'Point SHEET_ENDPOINT in shop-page.js at a hardened Apps Script web app', 'Open'),
  STRUCT(DATE '2026-11-19', 'Low', 'Domain',
    'DNSSEC and CAA records not verified',
    'At the domain registrar, enable DNSSEC and add a CAA record allowing only letsencrypt.org', 'Action needed (owner)')
]);
