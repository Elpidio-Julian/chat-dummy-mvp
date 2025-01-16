import os
import time
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta

# Initialize Firebase Admin with service account
cred = credentials.Certificate('credentials/firebase-credentials.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Constants
HELP_CHANNEL_ID = 'help'
BOT_USER_ID = os.getenv('BOT_USER_ID')

def send_bot_message(content, channel_id=HELP_CHANNEL_ID):
    """Send a message as the bot."""
    try:
        print(f"Attempting to send bot message: {content}")
        messages_ref = db.collection('messages').document(channel_id).collection('messages')
        messages_ref.add({
            'content': content,
            'userId': BOT_USER_ID,
            'userName': 'RAG Assistant',
            'createdAt': firestore.SERVER_TIMESTAMP,
            'isBot': True
        })
        print("Successfully sent bot message")
        return True
    except Exception as e:
        print(f"Error sending bot message: {e}")
        raise e

def handle_query_response(query, response, channel_id=HELP_CHANNEL_ID):
    """Handle a query response by sending messages and updating status."""
    try:
        print(f"Handling query response for: {query}")
        # Get the message reference for the query
        messages_ref = db.collection('messages').document(channel_id).collection('messages')
        
        # Get messages from the last 5 minutes
        five_minutes_ago = datetime.now() - timedelta(minutes=5)
        query_messages = messages_ref.where('createdAt', '>=', five_minutes_ago).get()
        
        message_sent = False
        print("Checking messages...")
        for msg in query_messages:
            message_data = msg.to_dict()
            print(f"Checking message: {message_data.get('content', '')}")
            # Check if this is the message we want to respond to
            if (message_data.get('content', '').lower().startswith('hey chatbot') and
                not message_data.get('isProcessed', False) and
                not message_data.get('isProcessing', False)):
                
                print("Found matching message, sending response...")
                # Mark as processing
                msg.reference.update({
                    'isProcessing': True,
                    'processingStartedAt': firestore.SERVER_TIMESTAMP
                })
                
                # Send typing indicator
                send_bot_message("_Thinking..._")
                time.sleep(1)  # Brief pause to show typing indicator
                
                # Send the actual response
                send_bot_message(response)
                
                # Mark as processed
                msg.reference.update({
                    'isProcessed': True,
                    'isProcessing': False,
                    'processedAt': firestore.SERVER_TIMESTAMP
                })
                
                message_sent = True
                print("Response sent and message marked as processed")
                break
        
        # If no matching message found, just send the response
        if not message_sent:
            print("No matching message found, sending direct response")
            send_bot_message(response)
                
    except Exception as e:
        print(f"Error handling query response: {e}")
        send_bot_message("Sorry, I encountered an error processing your request. Please try again later.")

def on_snapshot(doc_snapshot, changes, read_time):
    """Handle new messages in the help channel."""
    for change in changes:
        if change.type.name == 'ADDED':
            message_data = change.document.to_dict()
            
            # Check if message starts with "Hey Chatbot" and isn't from the bot
            if (message_data.get('content', '').lower().startswith('hey chatbot') and
                message_data.get('userId') != BOT_USER_ID and
                not message_data.get('isProcessed', False) and
                not message_data.get('isProcessing', False)):
                
                # Extract query (remove "Hey Chatbot" prefix)
                query = message_data['content'][11:].strip()
                
                # Send response directly
                handle_query_response(query, f"I received your query: {query}")

def main():
    """Main bot service function."""
    print("Starting bot service...")
    
    # Create a reference to the help channel messages
    help_messages_ref = db.collection('messages').document(HELP_CHANNEL_ID).collection('messages')
    
    # Create query for new messages
    query = help_messages_ref.where('createdAt', '>=', datetime.now())
    
    # Watch the query
    watch = query.on_snapshot(on_snapshot)
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down bot service...")
        watch.unsubscribe()

if __name__ == "__main__":
    main() 