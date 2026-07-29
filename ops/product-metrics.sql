WITH
telemetry AS (
  SELECT
    COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
    COUNT(DISTINCT CASE WHEN name = 'link_copied' THEN context END) AS links_copied,
    COUNT(DISTINCT CASE WHEN name = 'owner_opened' THEN context END) AS owner_opened,
    COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned,
    COUNT(DISTINCT CASE
      WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id
    END) AS users_7d
  FROM product_events
),
case_counts AS (
  SELECT
    COUNT(*) AS cases_created,
    COUNT(DISTINCT creator_session_id) AS seekers,
    COUNT(CASE WHEN status = 'solved' THEN 1 END) AS solved_cases,
    COUNT(CASE WHEN created_at >= unixepoch() - (7 * 86400) THEN 1 END) AS cases_7d
  FROM cases
  WHERE status <> 'hidden'
),
suggestion_counts AS (
  SELECT
    COUNT(*) AS suggestions,
    COUNT(DISTINCT suggestions.session_id) AS responders,
    COUNT(DISTINCT suggestions.case_id) AS cases_with_suggestions,
    COUNT(CASE WHEN suggestions.verdict = 'correct' THEN 1 END) AS correct_suggestions
  FROM suggestions
  JOIN cases ON cases.id = suggestions.case_id
  WHERE cases.status <> 'hidden' AND suggestions.verdict <> 'hidden'
),
deep_cases AS (
  SELECT COUNT(*) AS cases_with_3_responders
  FROM (
    SELECT suggestions.case_id
    FROM suggestions
    JOIN cases ON cases.id = suggestions.case_id
    WHERE cases.status <> 'hidden' AND suggestions.verdict <> 'hidden'
    GROUP BY suggestions.case_id
    HAVING COUNT(DISTINCT suggestions.session_id) >= 3
  )
),
repeat_seekers AS (
  SELECT COUNT(*) AS repeat_seekers
  FROM (
    SELECT creator_session_id
    FROM cases
    WHERE status <> 'hidden'
    GROUP BY creator_session_id
    HAVING COUNT(*) >= 2
  )
)
SELECT
  telemetry.*,
  case_counts.*,
  suggestion_counts.*,
  deep_cases.cases_with_3_responders,
  repeat_seekers.repeat_seekers
FROM telemetry, case_counts, suggestion_counts, deep_cases, repeat_seekers;
