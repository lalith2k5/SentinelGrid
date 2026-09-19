import { db } from '../db/database.ts';
import { Resource, ResourceAvailability, ResourceType } from '../db/schema.ts';

export class ResourceService {
  public getAllResources(filters?: {
    type?: ResourceType;
    availability?: ResourceAvailability;
    search?: string;
  }): Resource[] {
    let resources = db.getResources();

    if (!filters) return resources;

    if (filters.type) {
      resources = resources.filter(r => r.type === filters.type);
    }
    if (filters.availability) {
      resources = resources.filter(r => r.availability === filters.availability);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      resources = resources.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (r.statusDetails && r.statusDetails.toLowerCase().includes(q))
      );
    }

    return resources;
  }

  public createResource(params: {
    name: string;
    type: ResourceType;
    availability?: ResourceAvailability;
    location: string;
    capacity?: string;
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

    const validTypes: ResourceType[] = ['AMBULANCE', 'RESCUE_TEAM', 'MEDICAL_TEAM', 'SHELTER', 'EMERGENCY_EQUIPMENT'];
    if (!validTypes.includes(params.type)) {
      throw new Error(`Invalid resource type. Allowed types: ${validTypes.join(', ')}`);
    }

    const validAvailabilities: ResourceAvailability[] = ['AVAILABLE', 'DEPLOYED', 'MAINTENANCE', 'OFFLINE'];
    const availability: ResourceAvailability = params.availability && validAvailabilities.includes(params.availability)
      ? params.availability
      : 'AVAILABLE';

    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const resource: Resource = {
      id,
      name: trimmedName,
      type: params.type,
      availability,
      location: trimmedLocation,
      capacity: params.capacity?.trim() || undefined,
      statusDetails: params.statusDetails?.trim() || undefined,
      isDemoData: params.isDemoData ?? false,
      createdAt: now,
      updatedAt: now
    };

    db.insertResource(resource);

    db.logAudit({
      actorId: params.actorId,
      actorEmail: params.actorName,
      action: 'RESOURCE_REGISTERED',
      entityType: 'Resource',
      entityId: id,
      details: `Registered resource ${trimmedName} (${resource.type}) - ${resource.availability}`
    });

    return resource;
  }

  public updateResourceStatus(
    id: string,
    availability: ResourceAvailability,
    statusDetails?: string,
    actorName?: string,
    actorId?: string
  ): Resource | undefined {
    const validAvailabilities: ResourceAvailability[] = ['AVAILABLE', 'DEPLOYED', 'MAINTENANCE', 'OFFLINE'];
    if (!validAvailabilities.includes(availability)) {
      throw new Error(`Invalid availability status. Allowed values: ${validAvailabilities.join(', ')}`);
    }

    const updated = db.updateResource(id, { availability, statusDetails: statusDetails?.trim() });
    if (updated) {
      db.logAudit({
        actorId,
        actorEmail: actorName,
        action: 'RESOURCE_STATUS_UPDATED',
        entityType: 'Resource',
        entityId: id,
        details: `Updated ${updated.name} status to ${availability}`
      });
    }
    return updated;
  }

  public populateDemoData(): Resource[] {
    const items = [
      {
        name: 'Medic Unit Echo-1 [DEMO/TEST]',
        type: 'AMBULANCE' as ResourceType,
        availability: 'AVAILABLE' as ResourceAvailability,
        location: 'Staging Area Central, Sector 2',
        capacity: '2 Patients / Advanced Life Support',
        statusDetails: 'Full medical inventory, 4x4 capable vehicle',
        isDemoData: true
      },
      {
        name: 'Mountain Search & Rescue Bravo [DEMO/TEST]',
        type: 'RESCUE_TEAM' as ResourceType,
        availability: 'AVAILABLE' as ResourceAvailability,
        location: 'Highlands Ranger Station',
        capacity: '6 Personnel / Canine unit included',
        statusDetails: 'Equipped with rope rescue and thermal imaging gear',
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
