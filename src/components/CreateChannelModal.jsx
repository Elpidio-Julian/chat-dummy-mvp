import { useState } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChannel } from '../contexts/ChannelContext';

export default function CreateChannelModal({ onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const { currentUser } = useAuth();
  const { setSelectedChannel } = useChannel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || creating) return;

    try {
      setCreating(true);
      
      // Create the channel
      const channelsRef = collection(db, 'channels');
      const channelDoc = await addDoc(channelsRef, {
        name: name.trim().toLowerCase(),
        description: description.trim(),
        isPublic,
        createdBy: currentUser.uid,
        createdAt: new Date()
      });

      const channel = {
        id: channelDoc.id,
        name: name.trim().toLowerCase(),
        description: description.trim(),
        isPublic
      };

      // Add creator as channel member with admin role
      const memberRef = doc(db, 'channelMembers', channelDoc.id, 'members', currentUser.uid);
      await setDoc(memberRef, {
        userId: currentUser.uid,
        role: 'admin',
        joinedAt: new Date()
      });

      setSelectedChannel(channel);
      onClose();
    } catch (error) {
      console.error('Error creating channel:', error);
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Create Channel</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Channel Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
              className="mt-1 w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              Description (optional)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="mt-1 w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-300">
              Make this channel public
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 