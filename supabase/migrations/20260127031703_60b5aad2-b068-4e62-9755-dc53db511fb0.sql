-- 1. Remover duplicatas mantendo apenas o registro mais recente de cada cliente
DELETE FROM report_shares
WHERE id NOT IN (
  SELECT DISTINCT ON (client_id) id
  FROM report_shares
  ORDER BY client_id, created_at DESC
);

-- 2. Adicionar constraint UNIQUE para prevenir duplicatas futuras
ALTER TABLE report_shares 
ADD CONSTRAINT report_shares_client_id_unique UNIQUE (client_id);