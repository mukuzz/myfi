import { useState, useEffect, useMemo } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Tag, Transaction, TagMap } from '../types';
import { buildTagHierarchy, HierarchicalTag } from '../utils/tagUtils';
import TransactionWithNarration from './TransactionWithNarration';

interface TagSelectorProps {
  onSelectTag: (tagId: number | null) => void;
  availableTags: Tag[];
  tagMap: TagMap;
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
    <div className="flex flex-col h-full">

      {transaction && (
        <div className="mx-4">
          <TransactionWithNarration transaction={transaction} tagMap={tagMap} />
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

      <div className="flex-grow overflow-y-auto pt-1 space-y-5 p-4">

        {filteredHierarchy.map(parentTag => (
          <div className="flex flex-col bg-secondary rounded-xl" key={parentTag.id}>
            <div className="flex items-center mb-1 w-full cursor-pointer" onClick={() => handleSelect(parentTag.id)}>
              <input
                type="radio"
                name="tagSelection"
                id={`tag-${parentTag.id}`}
                checked={selectedTagId === parentTag.id || parentTag.children.some(c => c.id === selectedTagId)}
                readOnly
                className="mr-3 ml-4 h-5 w-5 text-primary border-border focus:ring-ring focus:ring-offset-background bg-secondary accent-secondary-foreground cursor-pointer"
              />
              <label htmlFor={`tag-${parentTag.id}`} className="text-base pt-4 pb-4 font-semibold text-foreground flex-grow cursor-pointer">
                {parentTag.name}
              </label>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto whitespace-nowrap px-5 pb-4">
              {parentTag.children && parentTag.children.map(childTag => {
                const isSelected = selectedTagId === childTag.id;
                return (
                  <button
                    key={childTag.id}
                    onClick={() => handleSelect(childTag.id)}
                    className={`px-3 py-2 rounded-full text-xs transition-colors duration-150 flex items-center space-x-1.5 flex-shrink-0
                      ${isSelected
                        ? 'bg-secondary-foreground text-primary-foreground'
                        : 'bg-input text-secondary-foreground'}
                    `}
                  >
                    {/* {icon && <span className="w-4 h-4">{icon}</span>} */}
                    <span>{childTag.name}</span>
                  </button>
                );
              })}

              <button
                key={`${parentTag.id}-others`}
                onClick={() => handleSelect(parentTag.id)}
                className={`px-2.5 py-1.5 rounded-full text-xs transition-colors duration-150 flex items-center space-x-1.5 flex-shrink-0
                  ${selectedTagId === parentTag.id
                    ? 'bg-secondary-foreground text-primary-foreground'
                    : 'bg-input text-secondary-foreground'}
                `}
              >
                <span>Others</span>
              </button>

              <div className="flex-shrink-0 w-1"></div>
            </div>
          </div>
        ))}

        <div className="flex items-center cursor-pointer" onClick={() => handleSelect(null)}>
          <input
            type="radio"
            name="tagSelection"
            id="tag-none"
            checked={selectedTagId === null}
            onChange={() => handleSelect(null)}
            className="mr-3 ml-4 h-5 w-5 text-primary border-border focus:ring-ring focus:ring-offset-background bg-secondary accent-secondary-foreground cursor-pointer"
          />
          <label htmlFor="tag-none" className="text-base pt-4 pb-4 font-semibold text-foreground flex-grow cursor-pointer">
            No Tag
          </label>
        </div>
      </div>
    </div>
  );
}

export default TagSelector; 