import { db } from '../db/database.ts';
import { Resource, ResourceAvailability, ResourceCapability, ResourceStatus, ResourceType } from '../db/schema.ts';

export class ResourceService {
  public getAllResources(filters?: {
    type?: ResourceType;
    availability?: ResourceAvailability;
    status?: ResourceStatus;
    search?: string;
  }): Resource[] {
    let resources = db.getResources();

    if (!filters) return resources;

    if (filters.type) {
      resources = resources.filter(r => r.type === filters.type);
    }
    if (filters.status) {
      resources = resources.filter(r => r.status === filters.status);
    } else if (filters.availability) {
      resources = resources.filter(r => r.availability === filters.availability || r.status === filters.availability);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      resources = resources.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.resourceCode && r.resourceCode.toLowerCase().includes(q)) ||
        r.location.toLowerCase().includes(q) ||
        (r.statusDetails && r.statusDetails.toLowerCase().includes(q)) ||
        (r.capabilities && r.capabilities.some(c => c.toLowerCase().includes(q)))
      );
    }

    return resources;
  }

  public createResource(params: {
    resourceCode?: string;
    name: string;
    type: ResourceType;
    capabilities?: ResourceCapability[];
    status?: ResourceStatus;
    availability?: ResourceAvailability;
    latitude?: number | null;
    longitude?: number | null;
    location: string;
    capacity?: string;
    patientCapacity?: number | null;
    criticalCareCapacity?: number | null;
    teamSize?: number | null;
    occupantCapacity?: number | null;
    supplyCapacity?: number | null;
    statusDetails?: string;
    isDemoData?: boolean;
    actorName?: string;
    actorId?: string;
  }): Resource {
    const trimmedName = (params.name || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Resource name is required and must be at least 2 characters long.');
    }

    const trimmedLocation = (params.location || '').trim();
    if (!trimmedLocation || trimmedLocation.length < 2) {
      throw new Error('Resource staging location is required and must be at least 2 characters long.');
    }

    const validTypes: ResourceType[] = [
      'AMBULANCE',
      'MEDICAL_TEAM',
      'FIRE_UNIT',
      'RESCUE_TEAM',
      'HAZMAT_UNIT',
      'SEARCH_TEAM',
      'EVACUATION_UNIT',
      'SHELTER',
      'SUPPLY_UNIT',
      'EMERGENCY_EQUIPMENT',
      'OTHER'
    ];
    if (!validTypes.includes(params.type)) {
      throw new Error(`Invalid resource type "${params.type}". Allowed types: ${validTypes.join(', ')}`);
    }

    if (params.latitude != null && (isNaN(params.latitude) || params.latitude < -90 || params.latitude > 90)) {
      throw new Error('Latitude must be a valid number between -90 and 90');
    }
    if (params.longitude != null && (isNaN(params.longitude) || params.longitude < -180 || params.longitude > 180)) {
      throw new Error('Longitude must be a valid number between -180 and 180');
    }

    const validStatuses: ResourceStatus[] = ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'UNAVAILABLE'];
    const status: ResourceStatus = params.status && validStatuses.includes(params.status)
      ? params.status
      : (params.availability as ResourceStatus) && validStatuses.includes(params.availability as ResourceStatus)
      ? (params.availability as ResourceStatus)
      : 'AVAILABLE';

    let capabilities = params.capabilities;
    if (!capabilities || capabilities.length === 0) {
      if (params.type === 'AMBULANCE' || params.type === 'MEDICAL_TEAM') capabilities = ['MEDICAL'];
      else if (params.type === 'FIRE_UNIT') capabilities = ['FIRE'];
      else if (params.type === 'RESCUE_TEAM') capabilities = ['RESCUE'];
      else if (params.type === 'HAZMAT_UNIT') capabilities = ['HAZMAT'];
      else if (params.type === 'SEARCH_TEAM') capabilities = ['SEARCH'];
      else if (params.type === 'EVACUATION_UNIT') capabilities = ['EVACUATION'];
      else if (params.type === 'SHELTER') capabilities = ['SHELTER'];
      else if (params.type === 'SUPPLY_UNIT') capabilities = ['SUPPLIES'];
      else capabilities = ['OTHER'];
    }

    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const resourceCode = params.resourceCode?.trim().toUpperCase() || `RES-${params.type.slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const resource: Resource = {
      id,
      resourceCode,
      name: trimmedName,
      type: params.type,
      capabilities,
      status,
      availability: status,
      latitude: params.latitude !== undefined ? params.latitude : null,
      longitude: params.longitude !== undefined ? params.longitude : null,
      location: trimmedLocation,
      capacity: params.capacity?.trim() || null,
      patientCapacity: params.patientCapacity,
      criticalCareCapacity: params.criticalCareCapacity,
      teamSize: params.teamSize,
      occupantCapacity: params.occupantCapacity,
      supplyCapacity: params.supplyCapacity,
      statusDetails: params.statusDetails?.trim() || undefined,
      currentIncidentId: null,
      isDemoData: params.isDemoData ?? false,
      createdAt: now,
      updatedAt: now
    };

    const inserted = db.insertResource(resource);

    db.logAudit({
      actorId: params.actorId,
      actorEmail: params.actorName,
      action: 'RESOURCE_REGISTERED',
      entityType: 'Resource',
      entityId: id,
      details: `Registered resource ${trimmedName} (${resourceCode}) - Capabilities: ${capabilities.join(', ')}`
    });

    return inserted;
  }

  public updateResourceStatus(
    id: string,
    status: ResourceStatus | ResourceAvailability,
    statusDetails?: string,
    actorName?: string,
    actorId?: string
  ): Resource | undefined {
    const validStatuses: ResourceStatus[] = ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'UNAVAILABLE'];
    const newStatus: ResourceStatus = validStatuses.includes(status as ResourceStatus)
      ? (status as ResourceStatus)
      : status === 'DEPLOYED'
      ? 'ASSIGNED'
      : 'AVAILABLE';

    const updated = db.updateResource(id, {
      status: newStatus,
      availability: newStatus,
      statusDetails: statusDetails?.trim()
    });

    if (updated) {
      db.logAudit({
        actorId,
        actorEmail: actorName,
        action: 'RESOURCE_STATUS_UPDATED',
        entityType: 'Resource',
        entityId: id,
        details: `Updated ${updated.name} status to ${newStatus}`
      });
    }
    return updated;
  }

  public allocateResource(
    resourceId: string,
    incidentId: string,
    actor?: { userId?: string; role?: string; name?: string }
  ): Resource {
    return db.allocateResource(resourceId, incidentId, actor);
  }

  public releaseResource(
    resourceId: string,
    actor?: { userId?: string; role?: string; name?: string }
  ): Resource {
    return db.releaseResource(resourceId, actor);
  }

  public populateDemoData(): Resource[] {
    const items = [
      {
        resourceCode: 'AMB-101',
        name: 'Medic Unit Echo-1 [DEMO]',
        type: 'AMBULANCE' as ResourceType,
        capabilities: ['MEDICAL'] as ResourceCapability[],
        status: 'AVAILABLE' as ResourceStatus,
        latitude: 10.0005,
        longitude: 10.0005,
        location: 'Staging Area Central (N-01)',
        capacity: '2 ALS Beds',
        statusDetails: 'Full medical inventory, 4x4 capable vehicle',
        isDemoData: true
      },
      {
        resourceCode: 'ENG-301',
        name: 'Hazmat Fire Engine 03 [DEMO]',
        type: 'HAZMAT_UNIT' as ResourceType,
        capabilities: ['HAZMAT', 'FIRE'] as ResourceCapability[],
        status: 'AVAILABLE' as ResourceStatus,
        latitude: 10.0100,
        longitude: 10.0100,
        location: 'Station Alpha (N-03)',
        capacity: 'Chemical Decon & Suppression',
        statusDetails: 'Equipped with Level-A suits & foam cannon',
        isDemoData: true
      },
      {
        resourceCode: 'SAR-201',
        name: 'Mountain Search & Rescue [DEMO]',
        type: 'SEARCH_TEAM' as ResourceType,
        capabilities: ['SEARCH', 'RESCUE'] as ResourceCapability[],
        status: 'AVAILABLE' as ResourceStatus,
        latitude: 10.0200,
        longitude: 10.0200,
        location: 'Highlands Outpost (N-06)',
        capacity: '6 Search Personnel + K9',
        statusDetails: 'Equipped with thermal imaging and winch gear',
        isDemoData: true
      },
      {
        resourceCode: 'SUP-401',
        name: 'Supply Transport Delta [DEMO]',
        type: 'SUPPLY_UNIT' as ResourceType,
        capabilities: ['SUPPLIES'] as ResourceCapability[],
        status: 'AVAILABLE' as ResourceStatus,
        latitude: null,
        longitude: null,
        location: 'Regional Logistics Hub',
        capacity: '5 Tons Rations & Water',
        statusDetails: 'Unmapped location test asset',
        isDemoData: true
      }
    ];

    return items.map(item => this.createResource(item));
  }

  public clearDemoData(): void {
    db.clearDemoResources();
  }
}

export const resourceService = new ResourceService();
