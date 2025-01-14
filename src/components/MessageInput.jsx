import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function MessageInput({ channelId }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const messagesRef = collection(db, 'messages', channelId, 'messages');
      await addDoc(messagesRef, {
        content: message.trim(),
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp()
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </form>
  );
} 