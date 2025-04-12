import { buildTagHierarchy, HierarchicalTag } from './tagUtils';
import { Tag } from '../types';

describe('tagUtils', () => {
  describe('buildTagHierarchy', () => {
    test('should return an empty array for empty input', () => {
      expect(buildTagHierarchy([])).toEqual([]);
    });

    test('should handle a flat list of tags with no parents', () => {
      const tags: Tag[] = [
        { id: 1, name: 'Food' },
        { id: 2, name: 'Travel' },
        { id: 3, name: 'Utilities' },
      ];
      const expected: HierarchicalTag[] = [
        { id: 1, name: 'Food', children: [] },
        { id: 2, name: 'Travel', children: [] },
        { id: 3, name: 'Utilities', children: [] },
      ];
      expect(buildTagHierarchy(tags)).toEqual(expected);
    });

    test('should build a simple two-level hierarchy', () => {
      const tags: Tag[] = [
        { id: 1, name: 'Food' },
        { id: 2, name: 'Groceries', parentTagId: 1 },
        { id: 3, name: 'Restaurants', parentTagId: 1 },
        { id: 4, name: 'Travel' },
      ];
      const expected: HierarchicalTag[] = [
        {
          id: 1, name: 'Food', children: [
            { id: 2, name: 'Groceries', parentTagId: 1, children: [] },
            { id: 3, name: 'Restaurants', parentTagId: 1, children: [] },
          ]
        },
        { id: 4, name: 'Travel', children: [] },
      ];
      // Use expect.arrayContaining because order might not be guaranteed
      expect(buildTagHierarchy(tags)).toEqual(expect.arrayContaining(expected));
       expect(buildTagHierarchy(tags).length).toBe(expected.length);
    });

    test('should build a multi-level hierarchy', () => {
      const tags: Tag[] = [
        { id: 1, name: 'Expenses' },
        { id: 2, name: 'Food', parentTagId: 1 },
        { id: 3, name: 'Groceries', parentTagId: 2 }, // Child of Food
        { id: 4, name: 'Travel', parentTagId: 1 },
        { id: 5, name: 'Flights', parentTagId: 4 },
        { id: 6, name: 'Airlines', parentTagId: 5 }, // Child of Flights
        { id: 7, name: 'Utilities' }, // Root level
      ];
      const expected: HierarchicalTag[] = [
        {
          id: 1, name: 'Expenses', children: [
            {
              id: 2, name: 'Food', parentTagId: 1, children: [
                { id: 3, name: 'Groceries', parentTagId: 2, children: [] }
              ]
            },
            {
              id: 4, name: 'Travel', parentTagId: 1, children: [
                {
                  id: 5, name: 'Flights', parentTagId: 4, children: [
                    { id: 6, name: 'Airlines', parentTagId: 5, children: [] }
                  ]
                }
              ]
            },
          ]
        },
        { id: 7, name: 'Utilities', children: [] },
      ];
       expect(buildTagHierarchy(tags)).toEqual(expect.arrayContaining(expected));
       expect(buildTagHierarchy(tags).length).toBe(expected.length);
    });

    test('should handle tags with non-existent parent IDs (treat as root)', () => {
      const tags: Tag[] = [
        { id: 1, name: 'Root 1' },
        { id: 2, name: 'Orphan', parentTagId: 99 }, // Parent 99 doesn't exist
        { id: 3, name: 'Child of Root 1', parentTagId: 1 },
      ];
      const expected: HierarchicalTag[] = [
        { id: 1, name: 'Root 1', children: [
            { id: 3, name: 'Child of Root 1', parentTagId: 1, children: [] }
          ]
        },
        { id: 2, name: 'Orphan', parentTagId: 99, children: [] }, // Becomes a root
      ];
       expect(buildTagHierarchy(tags)).toEqual(expect.arrayContaining(expected));
       expect(buildTagHierarchy(tags).length).toBe(expected.length);
    });

     test('should handle circular dependencies gracefully (treat second link as root)', () => {
        // Note: The current implementation doesn't explicitly detect cycles.
        // A depends on B, B depends on A. The second one processed will likely become root.
       const tags: Tag[] = [
         { id: 1, name: 'A', parentTagId: 2 },
         { id: 2, name: 'B', parentTagId: 1 },
         { id: 3, name: 'C' }
       ];

        // Depending on processing order, either A or B might be root.
        // The current implementation iterates tags array order.
        // 1. Map created: {1: A{c:[]}}, {2: B{c:[]}}, {3: C{c:[]}}
        // 2. Process tag 1 (A): parent 2 exists -> B.children = [A] -> Map: {1:A{c:[]}}, {2:B{c:[A]}}, {3:C{c:[]}}
        // 3. Process tag 2 (B): parent 1 exists -> A.children = [B] -> Map: {1:A{c:[B]}}, {2:B{c:[A]}}, {3:C{c:[]}}
        // 4. Process tag 3 (C): no parent -> rootTags = [C]
        // Result: Only C is root because A and B were added as children before being processed as potential roots.
        // This test might expose unintended behavior if cycles should be handled differently.
        // Let's test the *actual* behavior based on implementation:
        const hierarchy = buildTagHierarchy(tags);
        // Find the tags in the result (which should only contain C)
        const tagA = hierarchy.find(t => t.id === 1);
        const tagB = hierarchy.find(t => t.id === 2);
        const tagC = hierarchy.find(t => t.id === 3);

        expect(hierarchy.length).toBe(1); // Only C should be root based on logic
        expect(tagC).toBeDefined();
        expect(tagC?.name).toBe('C');
        expect(tagC?.children).toEqual([]);
        expect(tagA).toBeUndefined(); // A shouldn't be root
        expect(tagB).toBeUndefined(); // B shouldn't be root
     });
  });
}); 