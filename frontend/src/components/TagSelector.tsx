import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiSearch, FiTag, FiInfo } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { Tag, Transaction } from '../types';
import { getTagIcon } from '../utils/transactionUtils';
import { buildTagHierarchy, HierarchicalTag } from '../utils/tagUtils';
import TransactionDetailsCard from './TransactionDetailsCard';

interface TagSelectorProps {
  onSelectTag: (tagId: number | null) => void;
  availableTags: Tag[];
  tagMap: Map<number, string>;
  currentTagId?: number | null;
  transaction?: Transaction;
}

function TagSelector({ onSelectTag, availableTags, tagMap, currentTagId, transaction }: TagSelectorProps) {
  const [selectedTagId, setSelectedTagId] = useState<number | null | undefined>(currentTagId);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const tagHierarchy = useMemo(() => buildTagHierarchy(availableTags), [availableTags]);

  useEffect(() => {
    setSelectedTagId(currentTagId);
  }, [currentTagId]);

  const filteredHierarchy = useMemo(() => {
    if (!searchTerm) return tagHierarchy;
    const lowerSearchTerm = searchTerm.toLowerCase();

    const filter = (tags: HierarchicalTag[]): HierarchicalTag[] => {
      return tags.reduce((acc, tag) => {
        // Keep parent if its name matches OR if any child's name matches
        const matchingChildren = tag.children.filter(child => 
            child.name.toLowerCase().includes(lowerSearchTerm)
        );
        const parentMatches = tag.name.toLowerCase().includes(lowerSearchTerm);

        if (parentMatches || matchingChildren.length > 0) {
          // If parent matches, keep all children; otherwise, keep only matching children
          acc.push({ ...tag, children: parentMatches ? tag.children : matchingChildren });
        }
        return acc;
      }, [] as HierarchicalTag[]);
    };
    return filter(tagHierarchy);
  }, [searchTerm, tagHierarchy]);

  const handleSelect = (tagId: number | null) => {
    if (tagId === selectedTagId) return;
    
    setSelectedTagId(tagId);
    onSelectTag(tagId);
  };

  return (
    <>
      <div className="flex justify-between items-center pt-6 mb-4 flex-shrink-0 px-4">
        <div className="w-6 h-6"></div>
        <h2 className="text-lg font-semibold text-foreground">Tag transaction</h2>
        <div className="w-6 h-6"></div>
      </div>

      {transaction && (
        <div className="rounded-xl shadow overflow-hidden bg-secondary p-1 mb-4 flex-shrink-0 mx-4">
          <TransactionDetailsCard transaction={transaction} tagMap={tagMap} />
          {transaction.description && (
            <div className="bg-secondary p-2 mt-1">
              <div className="flex justify-between items-start">
                <p className="text-xs text-muted-foreground mr-2">
                  <span className="font-medium text-secondary-foreground">Narration:</span> {transaction.description}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relative mb-4 flex-shrink-0 mx-4">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-secondary border border-input rounded-lg pl-10 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-primary"
        />
      </div>

      <div className="flex-grow overflow-y-auto px-5 pt-1 space-y-5 no-scrollbar pb-4">
        <div className="flex items-center py-1 cursor-pointer" onClick={() => handleSelect(null)}>
          <input
            type="radio"
            name="tagSelection"
            id="tag-none"
            checked={selectedTagId === null}
            onChange={() => handleSelect(null)}
            className="mr-3 h-5 w-5 text-primary border-border focus:ring-ring focus:ring-offset-background bg-secondary flex-shrink-0"
          />
          <label htmlFor="tag-none" className="text-sm font-medium text-muted-foreground italic cursor-pointer">
            No Tag
          </label>
        </div>

        {filteredHierarchy.map(parentTag => (
          <div key={parentTag.id} className="py-1">
            <div className="flex items-center mb-3">
              <input
                type="radio"
                name="tagSelection"
                id={`tag-${parentTag.id}`}
                checked={selectedTagId === parentTag.id || parentTag.children.some(c => c.id === selectedTagId)}
                readOnly
                className="mr-3 h-5 w-5 text-primary border-border focus:ring-ring focus:ring-offset-background bg-secondary flex-shrink-0"
              />
              <label htmlFor={`tag-${parentTag.id}`} onClick={() => handleSelect(parentTag.id)} className="text-base font-semibold text-foreground cursor-pointer">
                {parentTag.name}
              </label>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap pl-8 pb-2 no-scrollbar">
              {parentTag.children && parentTag.children.map(childTag => {
                const isSelected = selectedTagId === childTag.id;
                const icon = getTagIcon(childTag.name);
                return (
                  <button
                    key={childTag.id}
                    onClick={() => handleSelect(childTag.id)}
                    className={`px-2.5 py-1.5 rounded-full text-xs transition-colors duration-150 flex items-center space-x-1.5 flex-shrink-0
                      ${isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-secondary-foreground hover:bg-border'}
                    `}
                  >
                    {icon && <span className="w-4 h-4">{icon}</span>}
                    <span>{childTag.name}</span>
                  </button>
                );
              })}

              <button
                key={`${parentTag.id}-others`}
                onClick={() => handleSelect(parentTag.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs transition-colors duration-150 flex items-center space-x-1.5 flex-shrink-0
                  ${selectedTagId === parentTag.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-secondary-foreground hover:bg-border'}
                `}
              >
                <span>Others</span>
              </button>

              <div className="flex-shrink-0 w-1"></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default TagSelector; 