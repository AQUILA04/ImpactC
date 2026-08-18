export type ImpactcProcessRole = 'api' | 'worker';

export function impactcProcessRole(): ImpactcProcessRole {
  const role = process.env.IMPACTC_PROCESS_ROLE ?? 'worker';
  if (role !== 'api' && role !== 'worker') {
    throw new Error('IMPACTC_PROCESS_ROLE must be either api or worker');
  }
  return role;
}

export function runsBackgroundWorkers(): boolean {
  return impactcProcessRole() === 'worker';
}
