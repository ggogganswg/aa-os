// src/projections/contracts/ProjectionRegistry.ts

import { ProjectionContract } from "./ProjectionContract";
import { ProjectionName } from "./types";

/**
 * Immutable registry of projection contracts.
 * No dynamic registration. No runtime mutation.
 */
export class ProjectionRegistry {
  private readonly map: Map<ProjectionName, ProjectionContract<any, any>>;

  constructor(definitions: readonly ProjectionContract<any, any>[]) {
    this.map = new Map(definitions.map((d) => [d.name, d]));
  }

  get(name: ProjectionName): ProjectionContract<any, any> {
    const projection = this.map.get(name);
    if (!projection) {
      throw new Error(`Unknown projection: ${name}`);
    }
    return projection;
  }

  list(): ProjectionName[] {
    return Array.from(this.map.keys());
  }
}
