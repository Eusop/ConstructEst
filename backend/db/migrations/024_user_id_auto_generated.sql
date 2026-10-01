-- Replaces the typed Employee ID with a User ID the system assigns:
-- year the account was made + a 4-digit number (e.g. 20260001). Homeowners
-- found "Employee ID" confusing. Numbers are never reused, even after a user
-- is deleted, because user_id_counters only goes up.
--
-- Existing users get new IDs here (in order of created_at). They can still
-- sign in with their email. The last SELECT lists everyone's new ID.
--
-- Run against the existing live database:
--   mysql -u root -p constructest < db/migrations/024_user_id_auto_generated.sql

USE constructest;

-- Last number given out per year (see services/userId.service.js).
CREATE TABLE user_id_counters (
  id_year SMALLINT UNSIGNED PRIMARY KEY,
  last_seq INT UNSIGNED NOT NULL
) ENGINE=InnoDB;

ALTER TABLE users ADD COLUMN user_id VARCHAR(20) NULL AFTER last_name;

UPDATE users u
JOIN (
  SELECT id,
         CONCAT(YEAR(created_at),
                LPAD(ROW_NUMBER() OVER (PARTITION BY YEAR(created_at) ORDER BY created_at, id), 4, '0')) AS new_id
  FROM users
) n ON n.id = u.id
SET u.user_id = n.new_id;

INSERT INTO user_id_counters (id_year, last_seq)
SELECT YEAR(created_at), COUNT(*) FROM users GROUP BY YEAR(created_at);

ALTER TABLE users DROP COLUMN employee_id;
ALTER TABLE users MODIFY COLUMN user_id VARCHAR(20) NOT NULL UNIQUE;

SELECT id, email, user_id FROM users ORDER BY user_id;
