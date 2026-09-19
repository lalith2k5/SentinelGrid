import { db } from '../db/database.ts';
import { Incident, IncidentSeverity, IncidentStatus, IncidentVerification } from '../db/schema.ts';

export class IncidentService {
  public getAllIncidents(filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    verificationStatus?: IncidentVerification;
    search?: string;
  }): Incident[] {
    let incidents = db.getIncidents();

    if (!filters) return incidents;

    if (filters.status) {
      incidents = incidents.filter(i => i.status === filters.status);
    }
    if (filters.severity) {
      incidents = incidents.filter(i => i.severity === filters.severity);
    }
    if (filters.verificationStatus) {
      incidents = incidents.filter(i => i.verificationStatus === filters.verificationStatus);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      incidents = incidents.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.incidentNumber.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.location?.address && i.location.address.toLowerCase().includes(q)) ||
        (i.location?.zone && i.location.zone.toLowerCase().includes(q))
      );
    }

    return incidents;
  }

  public getIncidentById(id: string): Incident | undefined {
    return db.findIncidentById(id);
  }

  public createIncident(params: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    status?: IncidentStatus;
    verificationStatus?: IncidentVerification;
    locationAddress?: string;
    zone?: string;
    gridSquare?: string;
    latitude?: number;
    longitude?: number;
    reportedByUserId?: string;
    reportedByName?: string;
    isDemoData?: boolean;
  }): Incident {
    const count = db.getIncidents().length + 1;
    const padNum = String(count).padStart(4, '0');
    const incidentNumber = `INC-${new Date().getFullYear()}-${padNum}`;
    const id = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const locationId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const location = {
      id: locationId,
      incidentId: id,
      latitude: params.latitude ?? 37.7749,
      longitude: params.longitude ?? -122.4194,
      address: params.locationAddress || 'Grid Coordinate Sector A',
      zone: params.zone || 'North Sector',
      gridSquare: params.gridSquare || 'GS-01'
    };

    const incident: Incident = {
      id,
      incidentNumber,
      title: params.title.trim(),
      description: params.description.trim(),
      status: params.status || 'OPEN',
      severity: params.severity || 'MEDIUM',
      verificationStatus: params.verificationStatus || 'UNVERIFIED',
      locationId,
      location,
      reportedByUserId: params.reportedByUserId,
      reportedByName: params.reportedByName || 'Field Operator',
      priorityScore: params.severity === 'CRITICAL' ? 95 : params.severity === 'HIGH' ? 75 : params.severity === 'MEDIUM' ? 50 : 25,
      isDemoData: params.isDemoData ?? false,
      createdAt: now,
      updatedAt: now
    };

    db.insertIncident(incident, location);

    db.logAudit({
      actorId: params.reportedByUserId,
      actorEmail: params.reportedByName,
      action: 'INCIDENT_CREATED',
      entityType: 'Incident',
      entityId: id,
      details: `Created incident ${incidentNumber}: ${params.title} [Severity: ${params.severity}]`
    });

    return incident;
  }

  public updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    actorName?: string,
    actorId?: string
  ): Incident | undefined {
    const updated = db.updateIncident(id, { status });
    if (updated) {
      db.logAudit({
        actorId,
        actorEmail: actorName,
        action: 'INCIDENT_STATUS_UPDATED',
        entityType: 'Incident',
        entityId: id,
        details: `Updated status of ${updated.incidentNumber} to ${status}`
      });
    }
    return updated;
  }

  public populateDemoData(): Incident[] {
    // Allows user to test empty-state vs populated-state cleanly with clearly marked DEMO badges
    const demoItems = [
      {
        title: 'Wildfire Spotting along Ridge Line [DEMO/TEST]',
        description: 'Smoke plume sighted near communications repeater tower. Wind blowing NE at 12 knots.',
        severity: 'CRITICAL' as IncidentSeverity,
        status: 'OPEN' as IncidentStatus,
        verificationStatus: 'COMMUNITY_REPORTED' as IncidentVerification,
        locationAddress: 'Ridge Road Mile 14, Sector Bravo',
        zone: 'North Zone',
        gridSquare: 'GS-04',
        isDemoData: true
      },
      {
        title: 'Bridge Structural Compromise [DEMO/TEST]',
        description: 'Flash flooding debris impacted bridge support pillar. Vehicle traffic diverted.',
        severity: 'HIGH' as IncidentSeverity,
        status: 'INVESTIGATING' as IncidentStatus,
        verificationStatus: 'OFFICIAL_VERIFIED' as IncidentVerification,
        locationAddress: 'Lower River Crossing, Route 9',
        zone: 'West Sector',
        gridSquare: 'GS-12',
        isDemoData: true
      }
    ];

    return demoItems.map(item => this.createIncident(item));
  }

  public clearDemoData(): void {
    db.clearDemoIncidents();
  }
}

export const incidentService = new IncidentService();
