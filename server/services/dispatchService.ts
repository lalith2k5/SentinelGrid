import crypto from 'crypto';
import { db } from '../db/database.ts';
import { Dispatch, DispatchStatus, DispatchReassignment } from '../db/schema.ts';
import { resourceMatchingService } from './resourceMatchingService.ts';
import { ServiceModuleInfo } from './aiTriageService.ts';

export function isValidTransition(current: DispatchStatus, next: DispatchStatus): boolean {
  if (current === next) return true;
  const allowed: Record<DispatchStatus, DispatchStatus[]> = {
    PENDING: ['DISPATCHED', 'CANCELLED'],
    DISPATCHED: ['ACKNOWLEDGED', 'DECLINED', 'CANCELLED'],
    ACKNOWLEDGED: ['EN_ROUTE', 'CANCELLED'],
    EN_ROUTE: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['ON_SCENE', 'CANCELLED'],
    ON_SCENE: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    DECLINED: [],
    CANCELLED: []
  };
  return allowed[current]?.includes(next) ?? false;
}

export class DispatchService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Dispatch & Responder Tasking Engine',
      phasePlanned: 6,
      isImplemented: true,
      statusText: 'Active — Phase 6 CAD & Status Machine',
      description: 'Computer-Aided Dispatch (CAD) assignment, responder workflow management, double-dispatch checks, and audit trails.',
      offlineCapability: '100% offline-capable with local persistence.'
    };
  }

  /**
   * Creates a new dispatch assignment.
   * Validates target incident/resource exists, resource eligibility, and double-dispatch.
   */
  public createDispatch(params: {
    incidentId: string;
    resourceId: string;
    dispatchNotes?: string;
    priority?: string;
    createdBy: string;
    actorRole: string;
    actorId: string;
  }): Dispatch {
    const incident = db.getIncidentById(params.incidentId);
    if (!incident) {
      throw new Error(`Incident with ID "${params.incidentId}" not found`);
    }

    const resource = db.getResourceById(params.resourceId);
    if (!resource) {
      throw new Error(`Resource with ID "${params.resourceId}" not found`);
    }

    // 1. Eligibility Check (Phase 5.1.1 rules)
    const matchingResult = resourceMatchingService.matchResourcesForIncident(params.incidentId);
    const match = matchingResult.matches.find(
      m => m.resourceId === resource.id || m.resourceCode === resource.resourceCode
    );

    if (!match) {
      throw new Error(`Resource compatibility evaluation failed`);
    }

    // Check specific route or status issues to return matching specific errors
    if (match.status !== 'AVAILABLE') {
      throw new Error('RESOURCE_UNAVAILABLE');
    }

    if (match.matchingFactors.capabilityScore <= 0) {
      throw new Error('INCOMPATIBLE_RESOURCE');
    }

    if (match.routeFeasibility === 'NO_SAFE_ROUTE') {
      throw new Error('NO_SAFE_ROUTE');
    }

    if (match.routeFeasibility === 'OUTSIDE_OFFLINE_MAP') {
      throw new Error('OUTSIDE_OFFLINE_MAP');
    }

    if (match.routeFeasibility === 'LOCATION_UNAVAILABLE') {
      throw new Error('LOCATION_UNAVAILABLE');
    }

    if (
      match.routeFeasibility !== 'REACHABLE' &&
      match.routeFeasibility !== 'REACHABLE_WITH_HAZARD_WARNING'
    ) {
      throw new Error('ROUTE_UNREACHABLE');
    }

    // 2. Double-Dispatch Prevention
    const activeDispatches = db.getDispatches().filter(
      d =>
        d.resourceId === resource.id &&
        ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE'].includes(d.status)
    );
    if (activeDispatches.length > 0) {
      throw new Error('RESOURCE_ALREADY_DISPATCHED');
    }

    // Validate dispatch notes length
    const notes = params.dispatchNotes?.trim() || '';
    if (notes.length > 500) {
      throw new Error('Dispatch notes must not exceed 500 characters');
    }

    // 3. Construct dispatch record first (before allocation, for safe persistence rollback)
    const now = new Date().toISOString();
    const uuid = crypto.randomUUID().substring(0, 8);
    const year = new Date().getFullYear();
    const dispatchId = `DSP-${year}-${uuid}`;
    const dispatch: Dispatch = {
      dispatchId,
      incidentId: incident.id,
      resourceId: resource.id,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
      status: 'PENDING',
      priority: params.priority || incident.severity || 'P3',
      routeInfo: match.routeInfo,
      dispatchNotes: notes,
      auditInfo: {
        createdActorId: params.actorId,
        createdActorRole: params.actorRole
      }
    };

    // 4. Perform atomic-like transaction with rollback
    let allocated = false;
    try {
      db.allocateResource(resource.id, incident.id, {
        userId: params.actorId,
        name: params.createdBy,
        role: params.actorRole
      });
      allocated = true;

      const inserted = db.insertDispatch(dispatch);

      // 5. Log audit trail
      db.logAudit({
        actorId: params.actorId,
        actorRole: params.actorRole,
        actorEmail: params.createdBy,
        action: 'DISPATCH_CREATED',
        entityType: 'Dispatch',
        entityId: dispatch.dispatchId,
        details: `Created dispatch assignment for Resource ${resource.name} to Incident ${incident.incidentNumber}. Notes: ${notes}`
      });

      return inserted;
    } catch (err) {
      if (allocated) {
        // Rollback resource allocation if persistence insertion failed
        try {
          db.releaseResource(resource.id, {
            userId: params.actorId,
            name: params.createdBy,
            role: params.actorRole
          });
        } catch (releaseErr) {
          console.error('Failed to rollback resource allocation during dispatch failure', releaseErr);
        }
      }
      throw err;
    }
  }

  /**
   * Transitions dispatch assignment to a new status.
   * Validates role authorization, transition eligibility, and timestamps.
   */
  public transitionDispatch(
    dispatchId: string,
    nextStatus: DispatchStatus,
    params: {
      userId: string;
      name: string;
      role: string;
      reason?: string;
      verifiedVictimCount?: number;
      notes?: string;
    }
  ): Dispatch {
    const dispatch = db.getDispatchById(dispatchId);
    if (!dispatch) {
      throw new Error(`Dispatch with ID "${dispatchId}" not found`);
    }

    // 1. Role Authorization Checks
    if (params.role === 'OPERATOR') {
      throw new Error('Operators are not authorized to update dispatch status');
    }

    if (params.role === 'RESPONDER') {
      const allowedForResponders: DispatchStatus[] = [
        'ACKNOWLEDGED',
        'DECLINED',
        'EN_ROUTE',
        'ARRIVED',
        'ON_SCENE',
        'COMPLETED'
      ];
      if (!allowedForResponders.includes(nextStatus)) {
        throw new Error(`Responders are not authorized to transition to status ${nextStatus}`);
      }
    }

    // 2. State Machine Validation
    if (!isValidTransition(dispatch.status, nextStatus)) {
      throw new Error(`Invalid status transition from ${dispatch.status} to ${nextStatus}`);
    }

    const updates: Partial<Dispatch> = {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    // Ensure audit tracking
    if (dispatch.auditInfo) {
      updates.auditInfo = {
        ...dispatch.auditInfo,
        updatedActorId: params.userId,
        updatedActorRole: params.role
      };
    }

    // 3. Reason Validations for Cancel/Decline
    if (nextStatus === 'CANCELLED') {
      const reason = params.reason?.trim() || '';
      if (reason.length < 4) {
        throw new Error('A cancellation reason of at least 4 characters is required');
      }
      updates.cancelledTimestamp = new Date().toISOString();
      updates.cancellationReason = reason;

      // Release resource
      db.releaseResource(dispatch.resourceId, {
        userId: params.userId,
        name: params.name,
        role: params.role
      });
    }

    if (nextStatus === 'DECLINED') {
      const reason = params.reason?.trim() || '';
      if (reason.length < 4) {
        throw new Error('A decline reason of at least 4 characters is required');
      }
      updates.declinedTimestamp = new Date().toISOString();
      updates.declineReason = reason;

      // Release resource
      db.releaseResource(dispatch.resourceId, {
        userId: params.userId,
        name: params.name,
        role: params.role
      });
    }

    // 4. Update status-specific timestamps and resource statuses
    if (nextStatus === 'ACKNOWLEDGED') {
      updates.acknowledgementTimestamp = new Date().toISOString();
      db.updateResource(dispatch.resourceId, {
        status: 'ASSIGNED',
        availability: 'ASSIGNED'
      });
    }

    if (nextStatus === 'EN_ROUTE') {
      updates.enRouteTimestamp = new Date().toISOString();
      db.updateResource(dispatch.resourceId, {
        status: 'EN_ROUTE',
        availability: 'EN_ROUTE'
      });
    }

    if (nextStatus === 'ARRIVED') {
      updates.arrivedTimestamp = new Date().toISOString();
      db.updateResource(dispatch.resourceId, {
        status: 'ASSIGNED', // "equivalent existing state" to preserve consistency and prevent premature ON_SCENE
        availability: 'ASSIGNED'
      });
    }

    if (nextStatus === 'ON_SCENE') {
      updates.onSceneTimestamp = new Date().toISOString();
      db.updateResource(dispatch.resourceId, {
        status: 'ON_SCENE',
        availability: 'ON_SCENE'
      });
    }

    if (nextStatus === 'COMPLETED') {
      updates.completedTimestamp = new Date().toISOString();

      const verifiedVictimCount = params.verifiedVictimCount;
      const notes = params.notes?.trim() || '';

      if (verifiedVictimCount !== undefined) {
        if (verifiedVictimCount < 0) {
          throw new Error('Verified victim count must be greater than or equal to 0');
        }
        updates.verifiedVictimCount = verifiedVictimCount;
      }
      if (notes) {
        if (notes.length > 500) {
          throw new Error('Notes must not exceed 500 characters');
        }
        updates.completionNotes = notes;
      }

      db.releaseResource(dispatch.resourceId, {
        userId: params.userId,
        name: params.name,
        role: params.role
      });
    }

    const updated = db.updateDispatch(dispatchId, updates);
    if (!updated) {
      throw new Error(`Failed to update dispatch record`);
    }

    // 5. Log Audit Log
    db.logAudit({
      actorId: params.userId,
      actorRole: params.role,
      actorEmail: params.name,
      action: `DISPATCH_${nextStatus}`,
      entityType: 'Dispatch',
      entityId: dispatchId,
      details: `Transitioned dispatch ${dispatchId} to ${nextStatus}.${params.reason ? ' Reason: ' + params.reason : ''}${updates.verifiedVictimCount !== undefined ? ' Verified Victims: ' + updates.verifiedVictimCount : ''}${updates.completionNotes ? ' Notes: ' + updates.completionNotes : ''}`
    });

    return updated;
  }

  /**
   * Reassigns an active dispatch to a new eligible resource.
   */
  public reassignDispatch(
    dispatchId: string,
    newResourceId: string,
    actor: {
      userId: string;
      name: string;
      role: string;
      reason: string;
    }
  ): Dispatch {
    const dispatch = db.getDispatchById(dispatchId);
    if (!dispatch) {
      throw new Error(`Dispatch with ID "${dispatchId}" not found`);
    }

    if (['COMPLETED', 'DECLINED', 'CANCELLED'].includes(dispatch.status)) {
      throw new Error(`Cannot reassign resource on a terminated dispatch (status: ${dispatch.status})`);
    }

    if (actor.role !== 'ADMIN' && actor.role !== 'DISPATCHER') {
      throw new Error('Only dispatchers and admins are authorized to reassign dispatches');
    }

    const reason = actor.reason?.trim() || '';
    if (reason.length < 4) {
      throw new Error('A reassignment reason of at least 4 characters is required');
    }

    const newResource = db.getResourceById(newResourceId);
    if (!newResource) {
      throw new Error(`Resource with ID "${newResourceId}" not found`);
    }

    // Check compatibility of the new resource for the incident
    const matchingResult = resourceMatchingService.matchResourcesForIncident(dispatch.incidentId);
    const match = matchingResult.matches.find(
      m => m.resourceId === newResource.id || m.resourceCode === newResource.resourceCode
    );

    if (!match) {
      throw new Error(`Resource compatibility evaluation failed`);
    }

    if (match.status !== 'AVAILABLE') {
      throw new Error('RESOURCE_UNAVAILABLE');
    }

    if (match.matchingFactors.capabilityScore <= 0) {
      throw new Error('INCOMPATIBLE_RESOURCE');
    }

    if (
      match.routeFeasibility !== 'REACHABLE' &&
      match.routeFeasibility !== 'REACHABLE_WITH_HAZARD_WARNING'
    ) {
      throw new Error('ROUTE_UNREACHABLE');
    }

    // Check double-dispatch of the new resource
    const activeDispatches = db.getDispatches().filter(
      d =>
        d.resourceId === newResource.id &&
        ['PENDING', 'DISPATCHED', 'ACKNOWLEDGED', 'EN_ROUTE', 'ARRIVED', 'ON_SCENE'].includes(d.status)
    );
    if (activeDispatches.length > 0) {
      throw new Error('RESOURCE_ALREADY_DISPATCHED');
    }

    const previousResourceId = dispatch.resourceId;

    // Release old resource
    db.releaseResource(previousResourceId, actor);

    // Allocate new resource
    db.allocateResource(newResource.id, dispatch.incidentId, actor);

    // Save history
    const historyItem: DispatchReassignment = {
      previousResourceId,
      newResourceId,
      reassignedBy: actor.name,
      reassignedAt: new Date().toISOString(),
      reason
    };

    const updatedHistory = [...(dispatch.reassignmentHistory || []), historyItem];

    const updates: Partial<Dispatch> = {
      resourceId: newResource.id,
      routeInfo: match.routeInfo,
      status: 'DISPATCHED', // Reset to dispatched for the new resource responder
      reassignmentHistory: updatedHistory,
      updatedAt: new Date().toISOString()
    };

    if (dispatch.auditInfo) {
      updates.auditInfo = {
        ...dispatch.auditInfo,
        updatedActorId: actor.userId,
        updatedActorRole: actor.role
      };
    }

    const updated = db.updateDispatch(dispatchId, updates);
    if (!updated) {
      throw new Error(`Failed to save reassignment updates`);
    }

    // Log Audit log
    db.logAudit({
      actorId: actor.userId,
      actorRole: actor.role,
      actorEmail: actor.name,
      action: 'DISPATCH_REASSIGNED',
      entityType: 'Dispatch',
      entityId: dispatchId,
      details: `Reassigned dispatch ${dispatchId} from Resource ${previousResourceId} to Resource ${newResourceId}. Reason: ${reason}`
    });

    return updated;
  }
}

export const dispatchService = new DispatchService();
