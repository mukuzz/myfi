import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiSearch, FiTag, FiInfo } from 'react-icons/fi';
import { LuIndianRupee } from 'react-icons/lu';
import { Tag, Transaction } from '../types';
import { getTagIcon } from '../utils/transactionUtils';
import { buildTagHierarchy, HierarchicalTag } from '../utils/tagUtils';
import TransactionDetailsCard from './TransactionDetailsCard';

interface TagSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTag: (tagId: number | null) => void;
  availableTags: Tag[];
  tagMap: Map<number, string>;
  currentTagId?: number | null;
  transaction?: Transaction;
}

function TagSelector({ isOpen, onClose, onSelectTag, availableTags, tagMap, currentTagId, transaction }: TagSelectorProps) {
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
    <div 
      className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-in-out 
        ${isOpen ? 'bg-opacity-75 pointer-events-auto' : 'bg-opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className={`fixed bottom-0 left-0 right-0 bg-gray-900 w-full max-w-lg mx-auto shadow-xl p-4 h-[95vh] flex flex-col rounded-t-xl 
                   transition-transform duration-300 ease-in-out z-50 
                   ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <FiX size={24} />
          </button>
          <h2 className="text-lg font-semibold text-white">Tag transaction</h2>
          <div className="w-6 h-6"></div>
        </div>

        {/* Render Card and Description Separately */} 
        {transaction && (
          <div className="rounded-xl shadow overflow-hidden bg-gray-700 p-1 mb-4 flex-shrink-0"> {/* Wrapper for card + description */} 
             <TransactionDetailsCard transaction={transaction} tagMap={tagMap} />
             {/* Render description here if present */}
             {transaction.description && (
                <div className="bg-gray-700 p-2 border-t border-gray-700"> {/* Adjusted styling */} 
                  <div className="flex justify-between items-start"> {/* Flex container for text and icon */}
                    <p className="text-xs text-gray-400 mr-2"> {/* Added margin-right */}
                      <span className="font-medium text-gray-300">Narration:</span> {transaction.description}
                    </p>
                  </div>
                </div>
             )}
          </div>
        )}

        <div className="relative mb-4 flex-shrink-0">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex-grow overflow-y-auto px-1 pt-1 space-y-5 no-scrollbar">
          <div className="flex items-center py-1 cursor-pointer" onClick={() => handleSelect(null)}>
            <input
              type="radio"
              name="tagSelection"
              id="tag-none"
              checked={selectedTagId === null}
              onChange={() => handleSelect(null)}
              className="mr-3 h-5 w-5 text-blue-500 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-900 bg-gray-700 flex-shrink-0"
            />
            <label htmlFor="tag-none" className="text-sm font-medium text-gray-400 italic cursor-pointer">
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
                  className="mr-3 h-5 w-5 text-blue-500 border-gray-600 focus:ring-blue-500 focus:ring-offset-gray-900 bg-gray-700 flex-shrink-0"
                />
                <label htmlFor={`tag-${parentTag.id}`} onClick={() => handleSelect(parentTag.id)} className="text-base font-semibold text-gray-100 cursor-pointer">
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
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} 
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
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} 
                      `}
                    >
                       <span>Others</span>
                     </button>

                  <div className="flex-shrink-0 w-1"></div> 
                 </div>
             </div>
           ))}
         </div>
       </div>
     </div>
   );
 }

 export default TagSelector; 