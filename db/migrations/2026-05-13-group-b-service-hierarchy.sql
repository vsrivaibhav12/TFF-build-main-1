-- ============================================================================
-- Group B — Service Hierarchy Rebuild
-- TFF Rebuild Plan v1.0 §4.3
-- Date: 2026-05-13
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add estimated_days to task_templates
-- ----------------------------------------------------------------------------
ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS estimated_days INT;

COMMENT ON COLUMN task_templates.estimated_days IS 'Expected number of days to complete a task from this template';

-- ----------------------------------------------------------------------------
-- 2. Create task_template_steps table
-- Steps belong to a Task Template, not a generic SOP.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_template_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  guidance_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  UNIQUE(task_template_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_task_template_steps_template
  ON task_template_steps(task_template_id) WHERE is_deleted = FALSE;

-- RLS
ALTER TABLE task_template_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_template_steps_admin" ON task_template_steps;
CREATE POLICY "task_template_steps_admin" ON task_template_steps
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "task_template_steps_team_read" ON task_template_steps;
CREATE POLICY "task_template_steps_team_read" ON task_template_steps
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('team', 'admin'));

-- ----------------------------------------------------------------------------
-- 3. Add service_head_id to client_services
-- Per-client, per-service accountable person.
-- ----------------------------------------------------------------------------
ALTER TABLE client_services
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id);

COMMENT ON COLUMN client_services.service_head_id IS 'Staff member accountable for this service for this client';

CREATE INDEX IF NOT EXISTS idx_client_services_service_head
  ON client_services(service_head_id);

-- ----------------------------------------------------------------------------
-- 4. Add service_head_id to tasks
-- Auto-populated from client-service assignment at task creation time.
-- ----------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS service_head_id UUID REFERENCES users_profile(id);

COMMENT ON COLUMN tasks.service_head_id IS 'Service head copied from client_services at task creation';

CREATE INDEX IF NOT EXISTS idx_tasks_service_head
  ON tasks(service_head_id);

-- ----------------------------------------------------------------------------
-- 5. Add source_template_step_id to task_steps
-- Provenance: which task template step seeded this row (NULL for ad-hoc steps)
-- ----------------------------------------------------------------------------
ALTER TABLE task_steps
  ADD COLUMN IF NOT EXISTS source_template_step_id UUID REFERENCES task_template_steps(id);

COMMENT ON COLUMN task_steps.source_template_step_id IS 'Reference to the task template step that seeded this task step';

CREATE INDEX IF NOT EXISTS idx_task_steps_source_template
  ON task_steps(source_template_step_id);

-- ----------------------------------------------------------------------------
-- 6. Backfill service_head_id on existing tasks from client_services
-- ----------------------------------------------------------------------------
UPDATE tasks
SET service_head_id = cs.service_head_id
FROM client_services cs
WHERE tasks.client_id = cs.client_id
  AND tasks.sub_service_id IN (
    SELECT id FROM sub_services WHERE service_id = cs.service_id
  )
  AND tasks.service_head_id IS NULL
  AND cs.service_head_id IS NOT NULL;
