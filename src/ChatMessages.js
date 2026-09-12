const ChatMessages = ({ chatHistory }) => {
  console.log('ChatHistory:', chatHistory);

  return (
    <div className="chat-messages">
      {chatHistory.map((message, index) => (
        <div
          key={index}
          className={`chat-message ${message.isBot ? 'bot' : 'user'}`} // Use `isBot` boolean for message sender check
        >
          {message.text}
        </div>
      ))}
    </div>
  );
};

export default ChatMessages;
