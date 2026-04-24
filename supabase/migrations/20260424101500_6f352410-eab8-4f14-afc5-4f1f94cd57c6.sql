UPDATE communities
SET
  country = 'El Salvador',
  country_code = 'SV',
  city = 'El Zonte'
WHERE
  name ILIKE '%bitcoin beach%'
  OR (city ILIKE '%el zonte%' AND country ILIKE '%nigeria%');