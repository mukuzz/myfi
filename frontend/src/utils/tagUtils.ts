import { Tag } from '../types';

export interface HierarchicalTag extends Tag {
  children: HierarchicalTag[];
}

export function buildTagHierarchy(tags: Tag[]): HierarchicalTag[] {
  const tagMap = new Map<number, HierarchicalTag>();
  const rootTags: HierarchicalTag[] = [];

  // Initialize map with children arrays
  tags.forEach(tag => {
    tagMap.set(tag.id, { ...tag, children: [] });
  });

  // Build hierarchy
  tags.forEach(tag => {
    const hierarchicalTag = tagMap.get(tag.id)!;
    if (tag.parentTagId && tagMap.has(tag.parentTagId)) {
      tagMap.get(tag.parentTagId)!.children.push(hierarchicalTag);
    } else {
      rootTags.push(hierarchicalTag);
    }
  });

  // Sort root tags by orderIndex
  rootTags.sort((a, b) => a.orderIndex - b.orderIndex);
  
  // Sort children within each parent by orderIndex
  rootTags.forEach(parentTag => {
    parentTag.children.sort((a, b) => a.orderIndex - b.orderIndex);
  });

  return rootTags;
} 