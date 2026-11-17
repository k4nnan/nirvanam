-- Nirvanam Studio: GA4 hit-level data in BigQuery
-- ==================================================
-- GA4 property 564785359 exports every event (one row per hit) to
--   nirvanam-analytics.analytics_564785359.events_YYYYMMDD
-- once a day. Those tables are the raw, permanent store; they are not subject
-- to GA4's own retention limit. The views below flatten them so each row is one
-- hit with the parameters this site sends as plain columns.
--
-- Run this file once in the BigQuery console (project nirvanam-analytics),
-- after the first daily export has created analytics_564785359.

CREATE SCHEMA IF NOT EXISTS `nirvanam-analytics.nirvanam_reporting`
OPTIONS (location = 'europe-west2', description = 'Flattened views over the GA4 export for nirvanamstudio.com');

-- 1. One row per hit (event), every parameter as its own column.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.events_hit_level`
OPTIONS (description = 'GA4 hit-level events for nirvanamstudio.com, one row per event, parameters flattened') AS
WITH events AS (
  SELECT *
  FROM `nirvanam-analytics.analytics_564785359.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday%'          -- avoid double counting today's streamed rows
)
SELECT
  PARSE_DATE('%Y%m%d', event_date)                                    AS event_date,
  TIMESTAMP_MICROS(event_timestamp)                                   AS event_time,
  event_name,
  user_pseudo_id                                                      AS ga_client_id,   -- same value as the _ga cookie ID saved in the CRM sheet
  user_id,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'ga_session_id')      AS ga_session_id,
  CONCAT(user_pseudo_id, '.', CAST((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS STRING)) AS session_key,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'ga_session_number')  AS session_number,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location')      AS page_location,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_title')         AS page_title,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_referrer')      AS page_referrer,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') AS engagement_time_msec,
  (SELECT value.int_value    FROM UNNEST(event_params) WHERE key = 'percent_scrolled')   AS percent_scrolled,

  -- calls to action (cta_click)
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_text')           AS cta_text,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_type')           AS cta_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_location')       AS cta_location,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_url')            AS cta_url,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'cta_outbound')       AS cta_outbound,

  -- signups and enquiries
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lead_id')            AS lead_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'place')              AS signup_form,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'segment')            AS interest_segment,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'variant')            AS headline_variant,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source')             AS site_source,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_id')            AS piece_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item_name')          AS piece_name,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'country')            AS lead_country,

  -- acquisition
  collected_traffic_source.manual_source                              AS utm_source,
  collected_traffic_source.manual_medium                              AS utm_medium,
  collected_traffic_source.manual_campaign_name                       AS utm_campaign,
  collected_traffic_source.manual_content                             AS utm_content,
  collected_traffic_source.manual_term                                AS utm_term,
  traffic_source.source                                               AS first_user_source,
  traffic_source.medium                                               AS first_user_medium,
  traffic_source.name                                                 AS first_user_campaign,

  -- device and location
  device.category                                                     AS device_category,
  device.operating_system                                             AS operating_system,
  device.web_info.browser                                             AS browser,
  device.language                                                     AS language,
  geo.country                                                         AS country,
  geo.region                                                          AS region,
  geo.city                                                            AS city,

  event_params                                                        AS all_event_params  -- anything not flattened above
FROM events;

-- 2. Identity stitching: every lead (signup or enquiry) with the anonymous
--    browser ID it came from. Join to the CRM sheet on lead_id, or on
--    ga_client_id = the sheet's "GA client ID" column.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.lead_identities`
OPTIONS (description = 'Each lead_id seen in GA4 with its anonymous ga_client_id') AS
SELECT
  lead_id,
  ga_client_id,
  ANY_VALUE(event_name)  AS lead_event,
  MIN(event_time)        AS lead_time
FROM `nirvanam-analytics.nirvanam_reporting.events_hit_level`
WHERE lead_id IS NOT NULL
GROUP BY lead_id, ga_client_id;

-- 3. The full anonymous journey of every lead: all hits from that browser,
--    before and after the signup.
CREATE OR REPLACE VIEW `nirvanam-analytics.nirvanam_reporting.lead_journeys`
OPTIONS (description = 'All hits from browsers that became leads, stitched by ga_client_id') AS
SELECT
  l.lead_id,
  l.lead_time,
  e.event_time < l.lead_time AS before_lead,
  e.* EXCEPT (lead_id)
FROM `nirvanam-analytics.nirvanam_reporting.lead_identities` AS l
JOIN `nirvanam-analytics.nirvanam_reporting.events_hit_level` AS e
  USING (ga_client_id);

-- Retention, once billing is enabled on the project (sandbox tables expire after 60 days):
-- 1. Keep 26 months of raw export for new daily tables, as stated in the privacy notice:
-- ALTER SCHEMA `nirvanam-analytics.analytics_564785359`
--   SET OPTIONS (default_table_expiration_days = 790);
-- 2. Tables created while in sandbox keep their 60-day expiry. Extend each one, e.g.:
-- ALTER TABLE `nirvanam-analytics.analytics_564785359.events_20261117`
--   SET OPTIONS (expiration_timestamp = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 790 DAY));
