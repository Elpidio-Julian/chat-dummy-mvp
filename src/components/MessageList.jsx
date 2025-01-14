import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function MessageList({ channelId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!channelId) return;

    // Query messages for the channel
    const messagesRef = collection(db, 'messages', channelId, 'messages');
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-400">No messages yet. Start the conversation!</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => (
        <div
          key={message.id}
          className={`flex ${message.userId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[70%] rounded-lg px-4 py-2 ${
              message.userId === currentUser.uid
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-200'
            }`}
          >
            {message.userId !== currentUser.uid && (
              <div className="text-xs text-gray-400 mb-1">
                {message.userName || 'Unknown User'}
              </div>
            )}
            <div>{message.content}</div>
            <div className="text-xs text-gray-400 mt-1">
              {message.createdAt?.toDate().toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 