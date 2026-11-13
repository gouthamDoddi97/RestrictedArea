export function alertEventTypesOverlap(a: string, b: string): boolean {
  if (a === 'both' || b === 'both') return true;
  return a === b;
}

export function isAllVehiclesRule(vehicleId: string | null | undefined): boolean {
  return vehicleId == null || vehicleId === '';
}

export function alertRulesClash(
  candidate: { vehicle_id?: string | null; event_type: string },
  existing: { vehicle_id?: string | null; event_type: string },
): boolean {
  const candidateAll = isAllVehiclesRule(candidate.vehicle_id);
  const existingAll = isAllVehiclesRule(existing.vehicle_id);
  if (candidateAll === existingAll && !candidateAll) {
    return false;
  }
  if (!alertEventTypesOverlap(candidate.event_type, existing.event_type)) {
    return false;
  }
  return candidateAll || existingAll;
}

export function alertRuleClashMessage(
  candidate: { vehicle_id?: string | null; event_type: string },
  existing: { vehicle_id?: string | null; event_type: string },
): string {
  const existingAll = isAllVehiclesRule(existing.vehicle_id);
  const candidateAll = isAllVehiclesRule(candidate.vehicle_id);
  if (existingAll && !candidateAll) {
    return (
      `This geofence already has an all-vehicles rule (event: ${existing.event_type}). ` +
      `A rule for one vehicle with overlapping event type (${candidate.event_type}) would clash, ` +
      `so the new rule cannot be saved. Remove or change the all-vehicles rule first.`
    );
  }
  if (candidateAll && !existingAll) {
    return (
      `This geofence already has a per-vehicle rule (event: ${existing.event_type}). ` +
      `An all-vehicles rule with overlapping event type (${candidate.event_type}) would clash, ` +
      `so the new rule cannot be saved. Remove or change the existing rule first.`
    );
  }
  return (
    `This geofence already has an all-vehicles rule (event: ${existing.event_type}) that overlaps ` +
    `${candidate.event_type}. The new rule cannot be saved.`
  );
}
