import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit3, FiMove, FiFolder, FiTag } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTags, createTag, updateTag, reorderTags } from '../store/slices/tagsSlice';
import { Tag } from '../types';
import { buildTagHierarchy, HierarchicalTag } from '../utils/tagUtils';
import { TagOrderUpdate } from '../services/apiService';
import ScreenContainer from '../components/ScreenContainer';

interface AddTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, parentTagId?: number) => void;
  parentTag?: Tag | null;
}

function AddTagModal({ isOpen, onClose, onAdd, parentTag }: AddTagModalProps) {
  const [tagName, setTagName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagName.trim()) {
      onAdd(tagName.trim(), parentTag?.id);
      setTagName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {parentTag ? `Add Child Tag to "${parentTag.name}"` : 'Add Tag for a Major Category'}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Enter tag name..."
            className="w-full p-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tagName.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (name: string) => void;
  tag: Tag | null;
}

function EditTagModal({ isOpen, onClose, onEdit, tag }: EditTagModalProps) {
  const [tagName, setTagName] = useState('');
  
  // Update the input when the tag changes
  React.useEffect(() => {
    if (tag) {
      setTagName(tag.name);
    }
  }, [tag]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagName.trim() && tag && tagName.trim() !== tag.name) {
      onEdit(tagName.trim());
      onClose();
    }
  };

  if (!isOpen || !tag) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Edit Tag
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="Enter tag name..."
            className="w-full p-3 border border-border rounded-lg bg-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!tagName.trim() || tagName.trim() === tag.name}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TagItemProps {
  tag: HierarchicalTag;
  level: number;
  onAddChild: (parentTag: Tag) => void;
  onEdit: (tag: Tag) => void;
  onReorder: (tag: Tag, direction: 'up' | 'down') => void;
  onReorderChild?: (parent: HierarchicalTag, child: Tag, direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function TagItem({ tag, level, onAddChild, onEdit, onReorder, onReorderChild, canMoveUp, canMoveDown }: TagItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-start gap-3 p-3 bg-card border border-border rounded-lg w-full">
        <div className="flex flex-grow flex-row items-center justify-start gap-2 w-full" style={{ paddingLeft: `${level * 20}px` }}>
          {level === 0 ? (
            <FiFolder className="text-primary" size={18} />
          ) : (
            <FiTag className="text-muted-foreground" size={16} />
          )}
          <span className="text-foreground font-medium text-wrap break-words text-ellipsis w-full">{tag.name}</span>
        </div>
        
        <div className="flex flex-0 items-center gap-1">
          {/* Reorder buttons */}
          <button
            onClick={() => onReorder(tag, 'up')}
            disabled={!canMoveUp}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <FiMove size={14} style={{ transform: 'rotate(-90deg)' }} />
          </button>
          <button
            onClick={() => onReorder(tag, 'down')}
            disabled={!canMoveDown}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <FiMove size={14} style={{ transform: 'rotate(90deg)' }} />
          </button>
          
          {/* Add child button (only for parent tags) */}
          {level === 0 && (
            <button
              onClick={() => onAddChild(tag)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-colors"
              title="Add child tag"
            >
              <FiPlus size={14} />
            </button>
          )}
          
          {/* Edit button */}
          <button
            onClick={() => onEdit(tag)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            title="Edit tag"
          >
            <FiEdit3 size={14} />
          </button>
        </div>
      </div>
      
      {/* Render children */}
      {tag.children.map((child, index) => (
        <TagItem
          key={child.id}
          tag={child}
          level={level + 1}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onReorder={(childTag, direction) => onReorderChild?.(tag, child, direction)}
          onReorderChild={onReorderChild}
          canMoveUp={index > 0}
          canMoveDown={index < tag.children.length - 1}
        />
      ))}
    </div>
  );
}


function TagManagementScreen() {
  const dispatch = useAppDispatch();
  const { tags, status, error } = useAppSelector((state) => state.tags);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedParentForAdd, setSelectedParentForAdd] = useState<Tag | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTagForEdit, setSelectedTagForEdit] = useState<Tag | null>(null);
  const [tagHierarchy, setTagHierarchy] = useState<HierarchicalTag[]>([]);
  
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTags());
    }
  }, [dispatch, status]);
  
  useEffect(() => {
    // Always update hierarchy when tags change, even if empty
    setTagHierarchy(buildTagHierarchy(tags));
  }, [tags]);
  
  const handleAddParentTag = () => {
    setSelectedParentForAdd(null);
    setIsAddModalOpen(true);
  };
  
  const handleAddChildTag = (parentTag: Tag) => {
    setSelectedParentForAdd(parentTag);
    setIsAddModalOpen(true);
  };
  
  const handleAddTag = async (name: string, parentTagId?: number) => {
    try {
      await dispatch(createTag({ 
        name, 
        parentTagId: parentTagId || null,
        orderIndex: 0 // Will be auto-set by backend
      })).unwrap();
      console.log('Tag created successfully');
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag. Please try again.');
    }
  };
  
  const handleEditTag = (tag: Tag) => {
    setSelectedTagForEdit(tag);
    setIsEditModalOpen(true);
  };
  
  const handleEditTagSubmit = async (newName: string) => {
    if (!selectedTagForEdit) return;
    
    try {
      await dispatch(updateTag({ 
        id: selectedTagForEdit.id, 
        tagData: { 
          name: newName,
          parentTagId: selectedTagForEdit.parentTagId,
          orderIndex: selectedTagForEdit.orderIndex
        } 
      })).unwrap();
      console.log('Tag updated successfully');
    } catch (error) {
      console.error('Failed to update tag:', error);
      alert('Failed to update tag. Please try again.');
    }
  };
  
  const handleReorderParent = async (tag: Tag, direction: 'up' | 'down') => {
    const parentTags = tagHierarchy;
    const currentIndex = parentTags.findIndex(t => t.id === tag.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= parentTags.length) return;
    
    try {
      // Swap order indices
      const updates: TagOrderUpdate[] = [
        { tagId: tag.id, newOrderIndex: parentTags[targetIndex].orderIndex },
        { tagId: parentTags[targetIndex].id, newOrderIndex: tag.orderIndex }
      ];
      
      await dispatch(reorderTags(updates)).unwrap();
      console.log('Parent tags reordered successfully');
    } catch (error) {
      console.error('Failed to reorder parent tags:', error);
      alert('Failed to reorder tags. Please try again.');
    }
  };
  
  const handleReorderChild = async (parent: HierarchicalTag, child: Tag, direction: 'up' | 'down') => {
    const childIndex = parent.children.findIndex(c => c.id === child.id);
    if (childIndex === -1) return;
    
    const targetIndex = direction === 'up' ? childIndex - 1 : childIndex + 1;
    if (targetIndex < 0 || targetIndex >= parent.children.length) return;
    
    try {
      // Swap order indices
      const updates: TagOrderUpdate[] = [
        { tagId: child.id, newOrderIndex: parent.children[targetIndex].orderIndex },
        { tagId: parent.children[targetIndex].id, newOrderIndex: child.orderIndex }
      ];
      
      await dispatch(reorderTags(updates)).unwrap();
      console.log('Child tags reordered successfully');
    } catch (error) {
      console.error('Failed to reorder child tags:', error);
      alert('Failed to reorder tags. Please try again.');
    }
  };
  
  // if (status === 'loading') {
  //   return (
  //     <ScreenContainer title="Tag Management">
  //       <div className="flex items-center justify-center h-64">
  //         <div className="text-muted-foreground">Loading tags...</div>
  //       </div>
  //     </ScreenContainer>
  //   );
  // }
  
  if (status === 'failed') {
    return (
      <ScreenContainer title="Tag Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error loading tags: {error}</div>
        </div>
      </ScreenContainer>
    );
  }
  
  return (
    <ScreenContainer title="Tag Management">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Manage Tags</h2>
            <p className="text-sm text-muted-foreground">
              Create, edit, and organize your transaction tags
            </p>
          </div>
          <button
            onClick={handleAddParentTag}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FiPlus size={16} />
            Add
          </button>
        </div>
        
        {/* Tags List */}
        <div className="space-y-3">
          {tagHierarchy.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FiTag size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">No tags yet</p>
              <p className="text-sm">Create your first parent tag to get started</p>
            </div>
          ) : (
            tagHierarchy.map((tag, index) => (
              <TagItem
                key={tag.id}
                tag={tag}
                level={0}
                onAddChild={handleAddChildTag}
                onEdit={handleEditTag}
                onReorder={handleReorderParent}
                onReorderChild={handleReorderChild}
                canMoveUp={index > 0}
                canMoveDown={index < tagHierarchy.length - 1}
              />
            ))
          )}
        </div>
        
        {/* Instructions */}
        {tagHierarchy.length > 0 && (
          <div className="bg-secondary border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Tips:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use the arrow buttons to reorder tags within their level</li>
              <li>• Parent tags can have multiple child tags for subcategorization</li>
              <li>• Edit button allows you to rename any tag</li>
              <li>• Tags are displayed in your custom order in transaction selectors</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Add Tag Modal */}
      <AddTagModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedParentForAdd(null);
        }}
        onAdd={handleAddTag}
        parentTag={selectedParentForAdd}
      />
      
      {/* Edit Tag Modal */}
      <EditTagModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTagForEdit(null);
        }}
        onEdit={handleEditTagSubmit}
        tag={selectedTagForEdit}
      />
    </ScreenContainer>
  );
}

export default TagManagementScreen;