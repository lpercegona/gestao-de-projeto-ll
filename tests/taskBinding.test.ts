import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileTaskBinding, resolveSubmitTaskId } from '../src/lib/taskBinding.ts';

const baseBinding = {
  taskId: 'task-1',
  snapshot: {
    taskTitle: 'Título Snapshot',
    taskDescription: 'Descrição Snapshot',
    projectName: 'Projeto Snapshot',
    clientName: 'Cliente Snapshot',
  },
};

test('timer iniciado no card e recarregado usa contexto atual', () => {
  const result = reconcileTaskBinding({
    binding: baseBinding,
    task: { id: 'task-1', name: 'Tarefa Atual', description: 'Descrição Atual', project_id: 'project-1' },
    project: { id: 'project-1', name: 'Projeto Atual', client_id: 'client-1' },
    client: { id: 'client-1', name: 'Cliente Atual', company: null },
  });

  assert.equal(result?.isValid, true);
  assert.deepEqual(result?.title, { value: 'Tarefa Atual', source: 'current' });
  assert.deepEqual(resolveSubmitTaskId({ bindingContext: result || null, selectedTaskId: '', linkMode: 'existing' }), { taskId: 'task-1', blocked: false });
});

test('tarefa removida após início cai para snapshot e bloqueia submit direto', () => {
  const result = reconcileTaskBinding({
    binding: { ...baseBinding, taskId: 'task-removed' },
    task: null,
    project: null,
    client: null,
  });

  assert.equal(result?.isValid, false);
  assert.deepEqual(result?.title, { value: 'Título Snapshot', source: 'snapshot' });
  assert.deepEqual(
    resolveSubmitTaskId({ bindingContext: result || null, selectedTaskId: 'task-removed', linkMode: 'existing' }),
    { taskId: null, blocked: true },
  );
});

test('retomada em outra aba/dispositivo prioriza dados atuais', () => {
  const result = reconcileTaskBinding({
    binding: {
      ...baseBinding,
      snapshot: { ...baseBinding.snapshot, taskTitle: 'Título Antigo' },
    },
    task: { id: 'task-1', name: 'Título Atualizado', description: null, project_id: 'project-1' },
    project: { id: 'project-1', name: 'Projeto Atual', client_id: 'client-1' },
    client: { id: 'client-1', name: 'Cliente Atual', company: 'Empresa Atual' },
  });

  assert.deepEqual(result?.title, { value: 'Título Atualizado', source: 'current' });
  assert.deepEqual(result?.client, { value: 'Empresa Atual', source: 'current' });
});
