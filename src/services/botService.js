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
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { queryRagApi } from './ragApi';

// Constants
const HELP_CHANNEL_ID = 'help';

/**
 * Process a single message with transaction to prevent duplicate processing
 * @param {Object} messageRef - Reference to the message document
 * @param {Object} message - The message data
 * @param {string} userId - Current user's ID
 * @returns {Promise<void>}
 */
const processMessageWithTransaction = async (messageRef, message, userId) => {
    try {
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) {
                throw new Error("Message does not exist!");
            }

            const messageData = messageDoc.data();
            
            // Check if message should be processed
            if (
                messageData.content.toLowerCase().startsWith('hey chatbot') &&
                messageData.userId === userId &&
                !messageData.isProcessed &&
                !messageData.isProcessing
            ) {
                // Mark as processing within the transaction
                transaction.update(messageRef, {
                    isProcessing: true,
                    processingStartedAt: serverTimestamp()
                });

                // Return true to indicate message should be processed
                return true;
            }
            
            // Return false to indicate message should not be processed
            return false;
        });

        // If transaction succeeded, process the message
        const query = message.content.slice(11).trim();
        console.log("Sending query to RAG API:", query);
        
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
        // Only reset processing state if we set it
        if (error.message !== "Message does not exist!") {
            await updateDoc(messageRef, {
                isProcessing: false,
                isProcessed: false,
                error: error.message
            });
        }
    }
};

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
                
                // Try to process the message with transaction
                if (message.content.toLowerCase().startsWith('hey chatbot')) {
                    await processMessageWithTransaction(messageRef, message, currentUser.uid);
                }
            }
        }
    });
}; 