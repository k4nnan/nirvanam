-- Data retention for the GA4 export dataset (run 19 Nov 2026, after billing was linked).
-- Keeps raw event tables for 790 days (~26 months, matching the privacy notice),
-- both for new daily tables (dataset default) and for tables that already existed.
-- Note: the billing account linked to nirvanam-analytics is a FREE TRIAL that ends
-- 18 Feb 2027; upgrade it to a paid account before then or project resources stop.

ALTER SCHEMA `nirvanam-analytics.analytics_564785359`
  SET OPTIONS (default_table_expiration_days = 790);

FOR t IN (
  SELECT table_name, creation_time
  FROM `nirvanam-analytics.analytics_564785359.INFORMATION_SCHEMA.TABLES`
  WHERE table_type = 'BASE TABLE'
) DO
  EXECUTE IMMEDIATE FORMAT(
    "ALTER TABLE `nirvanam-analytics.analytics_564785359.%s` SET OPTIONS (expiration_timestamp = TIMESTAMP '%t')",
    t.table_name, TIMESTAMP_ADD(t.creation_time, INTERVAL 790 DAY));
END FOR;
