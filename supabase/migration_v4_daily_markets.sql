-- Mercati giornalieri: colonna per i giorni di chiusura
-- 0 = domenica, 1 = lunedì, ..., 6 = sabato
ALTER TABLE markets ADD COLUMN IF NOT EXISTS closed_weekdays int[] DEFAULT '{}';
COMMENT ON COLUMN markets.closed_weekdays IS '0=domenica,1=lunedì,…,6=sabato — giorni di chiusura per mercati giornalieri';

-- Esempio: Mercato delle Pulci di Firenze, chiuso il lunedì
-- UPDATE markets SET frequency = 'giornaliero', closed_weekdays = '{1}' WHERE name ILIKE '%pulci%' AND city ILIKE '%firenze%';
