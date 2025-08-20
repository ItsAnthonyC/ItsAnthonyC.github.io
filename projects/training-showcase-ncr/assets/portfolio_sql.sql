
-- Clean region labels & compute net revenue
WITH clean_orders AS (
  SELECT
    o.*,
    CASE TRIM(LOWER(o.region))
      WHEN 'n. east' THEN 'Northeast'
      WHEN 'mid-west' THEN 'Midwest'
      WHEN 'south ' THEN 'South'
      WHEN 'west  ' THEN 'West'
      ELSE o.region
    END AS region_clean,
    (o.order_total - o.returned_amount) AS net_revenue
  FROM orders o
)
-- Monthly revenue & YoY helper
SELECT DATE_TRUNC('month', order_date) AS month, SUM(net_revenue) AS net_revenue
FROM clean_orders
GROUP BY 1
ORDER BY 1;
