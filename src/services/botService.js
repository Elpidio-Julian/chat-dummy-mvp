/**
 * Bot Service
 * Handles bot interactions with Firebase
 */

import { 
    getAuth,
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    Timestamp,
    updateDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { queryRagApi } from './ragApi';

// Constants
const HELP_CHANNEL_ID = 'help';

/**
 * Start listening for messages in the help channel
 * @returns {Function} Unsubscribe function
 */
export const startBotMessageListener = async () => {
    console.log("Starting bot message listener...");
    // Get current timestamp for filtering
    const startTime = Timestamp.now();

    // Query for new messages in help channel
    const messagesRef = collection(db, 'messages', HELP_CHANNEL_ID, 'messages');
    const q = query(
        messagesRef,
        where('createdAt', '>=', startTime),
        orderBy('createdAt', 'asc')
    );

    // Subscribe to new messages
    return onSnapshot(q, async (snapshot) => {
        const changes = snapshot.docChanges();
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            console.log("No user logged in, skipping message processing");
            return;
        }
        
        console.log(`Processing ${changes.length} message changes`);
        
        for (const change of changes) {
            if (change.type === 'added') {
                const messageRef = change.doc.ref;
                const message = change.doc.data();
                
                console.log("New message:", message.content);
                
                // Only process current user's Hey Chatbot messages
                if (
                    message.content.toLowerCase().startsWith('hey chatbot') &&
                    message.userId === currentUser.uid &&
                    !message.isProcessed && // Skip if already processed
                    !message.isProcessing // Skip if being processed
                ) {
                    console.log("Processing Hey Chatbot message");
                    try {
                        // Mark as processing to prevent duplicate processing
                        await updateDoc(messageRef, {
                            isProcessing: true,
                            processingStartedAt: serverTimestamp()
                        });

                        // Extract query (remove "Hey Chatbot" prefix)
                        const query = message.content.slice(11).trim();
                        console.log("Sending query to RAG API:", query);
                        
                        // Send query to RAG API with channel ID
                        const response = await queryRagApi(query, { 
                            sendToChat: true,
                            channelId: HELP_CHANNEL_ID 
                        });
                        console.log("Received response from RAG API:", response);
                        
                        // Mark as processed
                        await updateDoc(messageRef, {
                            isProcessed: true,
                            isProcessing: false,
                            processedAt: serverTimestamp()
                        });
                    } catch (error) {
                        console.error('Error processing message:', error);
                        // Reset processing state on error
                        await updateDoc(messageRef, {
                            isProcessing: false,
                            isProcessed: false,
                            error: error.message
                        });
                    }
                }
            }
        }
    });
}; 