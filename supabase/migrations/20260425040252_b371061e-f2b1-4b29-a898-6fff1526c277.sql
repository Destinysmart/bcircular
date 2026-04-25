UPDATE communities SET
  bbox_north = -29.55, bbox_south = -30.10,
  bbox_east = 29.85,  bbox_west = 29.20
WHERE slug = 'bitcoin-sisonke';

UPDATE communities SET
  bbox_north = -1.255, bbox_south = -1.330,
  bbox_east = 36.870, bbox_west = 36.760
WHERE slug = 'bitcoin-dada';

UPDATE communities SET
  bbox_north = -34.05, bbox_south = -34.13,
  bbox_east = 21.30,  bbox_west = 21.21
WHERE slug = 'bitcoin-ubuntu';

DELETE FROM merchants
WHERE source = 'btcmap'
  AND community_id IN (
    SELECT id FROM communities
    WHERE slug IN ('bitcoin-sisonke', 'bitcoin-dada', 'bitcoin-ubuntu')
  );