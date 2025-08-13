// Simple 3D model generator for tactical infrastructure
// This creates basic geometric shapes as placeholder models

interface ModelVertex {
  position: [number, number, number];
  normal: [number, number, number];
  texCoord: [number, number];
}

interface ModelGeometry {
  vertices: Float32Array;
  indices: Uint16Array;
  attributes: {
    POSITION: { value: Float32Array; size: 3 };
    NORMAL: { value: Float32Array; size: 3 };
    TEXCOORD_0: { value: Float32Array; size: 2 };
  };
}

class ModelGenerator {
  // Generate a communication tower model (tall cylinder with antenna)
  static generateTower(): ModelGeometry {
    const vertices: ModelVertex[] = [];
    const indices: number[] = [];
    
    // Tower base (cylinder)
    const segments = 8;
    const height = 2.0;
    const radius = 0.3;
    
    // Bottom circle
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      vertices.push({
        position: [x, 0, z],
        normal: [0, -1, 0],
        texCoord: [0.5 + x / radius * 0.5, 0.5 + z / radius * 0.5]
      });
    }
    
    // Top circle
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      vertices.push({
        position: [x, height, z],
        normal: [0, 1, 0],
        texCoord: [0.5 + x / radius * 0.5, 0.5 + z / radius * 0.5]
      });
    }
    
    // Side vertices
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const normal = [x / radius, 0, z / radius];
      
      vertices.push({
        position: [x, 0, z],
        normal: normal as [number, number, number],
        texCoord: [i / segments, 0]
      });
      
      vertices.push({
        position: [x, height, z],
        normal: normal as [number, number, number],
        texCoord: [i / segments, 1]
      });
    }
    
    // Antenna (thin vertical line)
    const antennaHeight = 1.0;
    const antennaRadius = 0.05;
    const antennaStart = segments * 4;
    
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = Math.cos(angle) * antennaRadius;
      const z = Math.sin(angle) * antennaRadius;
      
      vertices.push({
        position: [x, height, z],
        normal: [x / antennaRadius, 0, z / antennaRadius],
        texCoord: [i / 4, 0]
      });
      
      vertices.push({
        position: [x, height + antennaHeight, z],
        normal: [x / antennaRadius, 0, z / antennaRadius],
        texCoord: [i / 4, 1]
      });
    }
    
    // Generate indices
    // Bottom face
    for (let i = 1; i < segments - 1; i++) {
      indices.push(0, i + 1, i);
    }
    
    // Top face
    for (let i = 1; i < segments - 1; i++) {
      indices.push(segments, segments + i, segments + i + 1);
    }
    
    // Side faces
    const sideStart = segments * 2;
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const base = sideStart + i * 2;
      const nextBase = sideStart + next * 2;
      
      // Two triangles per side
      indices.push(base, base + 1, nextBase);
      indices.push(nextBase, base + 1, nextBase + 1);
    }
    
    // Antenna sides
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      const base = antennaStart + i * 2;
      const nextBase = antennaStart + next * 2;
      
      indices.push(base, base + 1, nextBase);
      indices.push(nextBase, base + 1, nextBase + 1);
    }
    
    return this.createGeometry(vertices, indices);
  }
  
  // Generate a radar dome model (sphere)
  static generateDome(): ModelGeometry {
    const vertices: ModelVertex[] = [];
    const indices: number[] = [];
    
    const segments = 16;
    const rings = 8;
    const radius = 0.8;
    
    // Generate sphere vertices
    for (let ring = 0; ring <= rings; ring++) {
      const phi = (ring / rings) * Math.PI;
      const y = Math.cos(phi) * radius;
      const ringRadius = Math.sin(phi) * radius;
      
      for (let segment = 0; segment <= segments; segment++) {
        const theta = (segment / segments) * Math.PI * 2;
        const x = Math.cos(theta) * ringRadius;
        const z = Math.sin(theta) * ringRadius;
        
        const normal = [x / radius, y / radius, z / radius] as [number, number, number];
        
        vertices.push({
          position: [x, y, z],
          normal,
          texCoord: [segment / segments, ring / rings]
        });
      }
    }
    
    // Generate sphere indices
    for (let ring = 0; ring < rings; ring++) {
      for (let segment = 0; segment < segments; segment++) {
        const current = ring * (segments + 1) + segment;
        const next = current + segments + 1;
        
        indices.push(current, next, current + 1);
        indices.push(current + 1, next, next + 1);
      }
    }
    
    return this.createGeometry(vertices, indices);
  }
  
  // Generate a building model (rectangular prism)
  static generateBuilding(): ModelGeometry {
    const vertices: ModelVertex[] = [];
    const indices: number[] = [];
    
    const width = 1.2;
    const height = 1.5;
    const depth = 0.8;
    
    const faces = [
      // Front face
      { normal: [0, 0, 1], positions: [
        [-width/2, 0, depth/2], [width/2, 0, depth/2], [width/2, height, depth/2], [-width/2, height, depth/2]
      ]},
      // Back face
      { normal: [0, 0, -1], positions: [
        [width/2, 0, -depth/2], [-width/2, 0, -depth/2], [-width/2, height, -depth/2], [width/2, height, -depth/2]
      ]},
      // Left face
      { normal: [-1, 0, 0], positions: [
        [-width/2, 0, -depth/2], [-width/2, 0, depth/2], [-width/2, height, depth/2], [-width/2, height, -depth/2]
      ]},
      // Right face
      { normal: [1, 0, 0], positions: [
        [width/2, 0, depth/2], [width/2, 0, -depth/2], [width/2, height, -depth/2], [width/2, height, depth/2]
      ]},
      // Top face
      { normal: [0, 1, 0], positions: [
        [-width/2, height, depth/2], [width/2, height, depth/2], [width/2, height, -depth/2], [-width/2, height, -depth/2]
      ]},
      // Bottom face
      { normal: [0, -1, 0], positions: [
        [-width/2, 0, -depth/2], [width/2, 0, -depth/2], [width/2, 0, depth/2], [-width/2, 0, depth/2]
      ]}
    ];
    
    faces.forEach((face) => {
      const baseIndex = vertices.length;
      
      face.positions.forEach((pos, vertIndex) => {
        vertices.push({
          position: pos as [number, number, number],
          normal: face.normal as [number, number, number],
          texCoord: [vertIndex % 2, Math.floor(vertIndex / 2)]
        });
      });
      
      // Two triangles per face
      indices.push(
        baseIndex, baseIndex + 1, baseIndex + 2,
        baseIndex, baseIndex + 2, baseIndex + 3
      );
    });
    
    return this.createGeometry(vertices, indices);
  }
  
  // Generate aircraft model (delta wing shape)
  static generateAircraft(): ModelGeometry {
    const vertices: ModelVertex[] = [];
    const indices: number[] = [];
    
    const length = 2.0;
    const wingspan = 1.5;
    const height = 0.2;
    
    // Aircraft body (delta wing shape)
    const bodyVertices = [
      // Nose
      [0, 0, length/2],
      [0, height, length/2],
      
      // Wing tips
      [-wingspan/2, 0, -length/3],
      [-wingspan/2, height/2, -length/3],
      [wingspan/2, 0, -length/3],
      [wingspan/2, height/2, -length/3],
      
      // Tail
      [0, 0, -length/2],
      [0, height, -length/2],
    ];
    
    bodyVertices.forEach((pos, i) => {
      vertices.push({
        position: pos as [number, number, number],
        normal: [0, 1, 0], // Simplified normal
        texCoord: [i % 2, Math.floor(i / 2) / 4]
      });
    });
    
    // Wing triangles
    const wingIndices = [
      // Top wing surface
      1, 3, 5, 1, 5, 7,
      // Bottom wing surface  
      0, 4, 2, 0, 6, 4,
      // Wing edges
      0, 1, 3, 0, 3, 2,
      4, 5, 7, 4, 7, 6
    ];
    
    indices.push(...wingIndices);
    
    return this.createGeometry(vertices, indices);
  }
  
  private static createGeometry(vertices: ModelVertex[], indices: number[]): ModelGeometry {
    const positions = new Float32Array(vertices.length * 3);
    const normals = new Float32Array(vertices.length * 3);
    const texCoords = new Float32Array(vertices.length * 2);
    
    vertices.forEach((vertex, i) => {
      positions[i * 3] = vertex.position[0];
      positions[i * 3 + 1] = vertex.position[1];
      positions[i * 3 + 2] = vertex.position[2];
      
      normals[i * 3] = vertex.normal[0];
      normals[i * 3 + 1] = vertex.normal[1];
      normals[i * 3 + 2] = vertex.normal[2];
      
      texCoords[i * 2] = vertex.texCoord[0];
      texCoords[i * 2 + 1] = vertex.texCoord[1];
    });
    
    return {
      vertices: positions,
      indices: new Uint16Array(indices),
      attributes: {
        POSITION: { value: positions, size: 3 },
        NORMAL: { value: normals, size: 3 },
        TEXCOORD_0: { value: texCoords, size: 2 }
      }
    };
  }
}

export default ModelGenerator;
export type { ModelGeometry };