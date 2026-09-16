SELECT
    c.id,
    c.name,
    c.email,
    SUM(p.total_amount) AS total_spent
FROM customers c
JOIN purchases p ON p.customer_id = c.id
JOIN products pr ON pr.id = p.product_id
JOIN customer_consents cc ON cc.customer_id = c.id
WHERE c.city = 'Ho Chi Minh City'
  AND pr.category = 'electronics'
  AND p.purchased_at >= NOW() - INTERVAL '3 months'
  AND cc.marketing_allowed = TRUE
GROUP BY c.id, c.name, c.email
HAVING SUM(p.total_amount) >= 10000000
ORDER BY total_spent DESC
LIMIT 100;
