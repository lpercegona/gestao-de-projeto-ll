-- =============================================
-- FASE 1A: Adicionar novos valores ao enum
-- =============================================
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'master_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'collaborator';