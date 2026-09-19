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
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    verificationStatus?: IncidentVerification;
    locationAddress?: string;
    zone?: string;
    gridSquare?: string;
    latitude?: number | null;
    longitude?: number | null;
    reportedByUserId?: string;
    reportedByName?: string;
    isDemoData?: boolean;
  }): Incident {
    const trimmedTitle = (params.title || '').trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      throw new Error('Incident title is required and must be at least 3 characters long.');
    }
    if (trimmedTitle.length > 200) {
      throw new Error('Incident title must be at most 200 characters long.');
    }

    const trimmedDescription = (params.description || '').trim();
    if (!trimmedDescription || trimmedDescription.length < 5) {
      throw new Error('Incident description is required and must be at least 5 characters long.');
    }

    const validSeverities: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
    const severity: IncidentSeverity = params.severity && validSeverities.includes(params.severity)
      ? params.severity
      : 'MEDIUM';

    const validStatuses: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'DISPATCHED', 'CONTAINED', 'RESOLVED'];
    const status: IncidentStatus = params.status && validStatuses.includes(params.status)
      ? params.status
      : 'OPEN';

    // Parse and validate coordinates without fake fallbacks
    let lat: number | null = null;
    let lon: number | null = null;

    if (params.latitude !== undefined && params.latitude !== null && params.latitude !== ('' as any)) {
      const parsedLat = Number(params.latitude);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        throw new Error('Latitude must be a valid number between -90 and 90 degrees.');
      }
      lat = parsedLat;
    }

    if (params.longitude !== undefined && params.longitude !== null && params.longitude !== ('' as any)) {
      const parsedLon = Number(params.longitude);
      if (isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180) {
        throw new Error('Longitude must be a valid number between -180 and 180 degrees.');
      }
      lon = parsedLon;
    }

    // Monotonic sequential numbering tracking: INC-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const seq = db.getNextIncidentSequence(currentYear);
    const padNum = String(seq).padStart(4, '0');
    const incidentNumber = `INC-${currentYear}-${padNum}`;
    const id = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const locationId = `loc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const hasCoordinates = lat !== null && lon !== null;
    const hasAddress = Boolean(params.locationAddress && params.locationAddress.trim());

    const location = {
      id: locationId,
      incidentId: id,
      latitude: lat,
      longitude: lon,
      address: hasAddress ? params.locationAddress!.trim() : undefined,
      zone: params.zone?.trim() || undefined,
      gridSquare: params.gridSquare?.trim() || undefined,
      isUnavailable: !hasCoordinates && !hasAddress
    };

    const incident: Incident = {
      id,
      incidentNumber,
      title: trimmedTitle,
      description: trimmedDescription,
      status,
      severity,
      verificationStatus: params.verificationStatus || 'UNVERIFIED',
      locationId,
      location,
      reportedByUserId: params.reportedByUserId,
      reportedByName: params.reportedByName || 'Field Operator',
      priorityScore: severity === 'CRITICAL' ? 95 : severity === 'HIGH' ? 75 : severity === 'MEDIUM' ? 50 : 25,
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
      details: `Created incident ${incidentNumber}: ${trimmedTitle} [Severity: ${severity}] Location: ${hasCoordinates ? `${lat}, ${lon}` : hasAddress ? location.address : 'Location unavailable'}`
    });

    return incident;
  }

  public updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    actorName?: string,
    actorId?: string
  ): Incident | undefined {
    const validStatuses: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'DISPATCHED', 'CONTAINED', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid incident status. Allowed statuses: ${validStatuses.join(', ')}`);
    }

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
