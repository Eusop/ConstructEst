-- "By member" breakdown of each estimate, laid out like the engineer's
-- manual sheets (Footing, Column, Beam, ... with concrete, rebar and
-- formworks). Null for estimates saved before this; Recalculate fills it in.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/043_member_breakdown.sql

USE constructest;

ALTER TABLE estimation_results
  ADD COLUMN member_breakdown JSON NULL AFTER computed_defaults;
